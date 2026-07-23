import { NextRequest } from "next/server";
import { assertSameOrigin, jsonNoStore } from "@/lib/auth/security";
import { clearSessionCookies, getAccessToken } from "@/lib/auth/session";
import { supabaseFetch } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const token = await getAccessToken();
  if (token) await supabaseFetch("/auth/v1/logout", { method: "POST", token });
  await clearSessionCookies();
  return jsonNoStore({ ok: true });
}
