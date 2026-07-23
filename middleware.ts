import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "ds_access_token";
const REFRESH_COOKIE = "ds_refresh_token";

type RefreshSessionResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL("/administrativo/login", request.url);
  const requested = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requested.startsWith("/") && !requested.startsWith("//")) loginUrl.searchParams.set("redirect", requested);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

async function validate(url: string, anonKey: string, token: string) {
  return fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/administrativo/login") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) return loginRedirect(request);

  let token = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let validation = token ? await validate(url, anonKey, token) : null;
  let refreshed: RefreshSessionResponse | null = null;

  if ((!validation || !validation.ok) && refreshToken) {
    const refresh = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (refresh.ok) {
      const refreshPayload = (await refresh.json()) as Partial<RefreshSessionResponse>;
      if (refreshPayload.access_token && refreshPayload.refresh_token) {
        refreshed = {
          access_token: refreshPayload.access_token,
          refresh_token: refreshPayload.refresh_token,
          expires_in: refreshPayload.expires_in,
        };
      }
      token = refreshed?.access_token;
      validation = token ? await validate(url, anonKey, token) : null;
    }
  }

  if (!token || !validation?.ok) return loginRedirect(request);
  const user = (await validation.json()) as { id?: string; user_metadata?: Record<string, unknown> };
  if (!user.id) return loginRedirect(request);

  const profileResponse = await fetch(
    `${url}/rest/v1/profiles?select=role,is_active&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    {
      headers: { apikey: serviceRoleKey || anonKey, Authorization: `Bearer ${serviceRoleKey || token}` },
      cache: "no-store",
    },
  );
  const profiles = profileResponse.ok ? ((await profileResponse.json()) as Array<{ role?: string; is_active?: boolean }>) : [];
  const profile = profiles[0];
  if (!profile?.is_active) return loginRedirect(request);

  if (user.user_metadata?.must_change_password === true && request.nextUrl.pathname !== "/administrativo/alterar-senha") {
    return NextResponse.redirect(new URL("/administrativo/alterar-senha", request.url));
  }

  const role=profile.role||"";
  if (!["admin", "supervisor", "operator"].includes(role)) {
    return NextResponse.redirect(new URL("/administrativo/login", request.url));
  }
  if(request.nextUrl.pathname.startsWith("/administrativo/plantoes")&&role!=="admin"){
    return NextResponse.redirect(new URL("/administrativo",request.url));
  }

  const response = NextResponse.next();
  if (refreshed?.access_token && refreshed.refresh_token) {
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ACCESS_COOKIE, refreshed.access_token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: Math.min(refreshed.expires_in || 3600, 3600) });
    response.cookies.set(REFRESH_COOKIE, refreshed.refresh_token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/administrativo/:path*"] };
