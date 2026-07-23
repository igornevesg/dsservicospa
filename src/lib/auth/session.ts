import "server-only";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabase/server";

export const ACCESS_COOKIE = "ds_access_token";
export const REFRESH_COOKIE = "ds_refresh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionProfile = {
  id: string;
  full_name: string;
  role: "admin" | "supervisor" | "operator" | "employee";
  employee_id: string | null;
  company_id: string | null;
  is_active: boolean;
};

export async function setSessionCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: Math.max(60, Math.min(expiresIn, 3600)),
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value || null;
}

export async function requireUser() {
  const token = await getAccessToken();
  if (!token) return null;
  const userResult = await supabaseFetch<{ id?: string; user_metadata?: Record<string, unknown> }>("/auth/v1/user", { token });
  if (!userResult.response.ok || !userResult.data.id) return null;
  const profileResult = await supabaseFetch<SessionProfile[]>(
    `/rest/v1/profiles?select=id,full_name,role,employee_id,company_id,is_active&id=eq.${encodeURIComponent(userResult.data.id)}&limit=1`,
    { serviceRole: true },
  );
  const profile = profileResult.data?.[0];
  if (!profileResult.response.ok || !profile?.is_active) return null;
  return { token, user: userResult.data, profile };
}

export async function requireManager() {
  const session = await requireUser();
  if (!session || !["admin", "supervisor"].includes(session.profile.role)) return null;
  return session;
}

export async function requireStaff() {
  const session = await requireUser();
  if (!session || !["admin", "supervisor", "operator"].includes(session.profile.role)) return null;
  return session;
}
