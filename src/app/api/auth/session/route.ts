import { NextRequest } from "next/server";
import { assertSameOrigin, jsonNoStore, normalizeEmail, safeRedirectPath } from "@/lib/auth/security";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth/session";
import { supabaseFetch } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; user_metadata?: Record<string, unknown> };
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16_384) return jsonNoStore({ error: "Requisição inválida." }, 413);

    const body = (await request.json()) as { email?: unknown; password?: unknown; redirect?: unknown };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || password.length < 8 || password.length > 128) {
      return jsonNoStore({ error: "E-mail ou senha inválidos." }, 401);
    }
    if (!await consumeRateLimit(request, "login", email, 8, 15 * 60, 15 * 60)) {
      return jsonNoStore({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, 429);
    }

    const auth = await supabaseFetch<LoginResponse>("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!auth.response.ok || !auth.data.access_token || !auth.data.refresh_token || !auth.data.user?.id) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      return jsonNoStore({ error: "E-mail ou senha inválidos." }, 401);
    }

    const profileResult = await supabaseFetch<Array<{ role: string; is_active: boolean }>>(
      `/rest/v1/profiles?select=role,is_active&id=eq.${encodeURIComponent(auth.data.user.id)}&limit=1`,
      { token: auth.data.access_token },
    );
    const profile = profileResult.data?.[0];
    if (!profileResult.response.ok || !profile?.is_active) {
      await clearSessionCookies();
      return jsonNoStore({ error: "Acesso indisponível. Procure o administrador." }, 403);
    }

    await setSessionCookies(auth.data.access_token, auth.data.refresh_token, auth.data.expires_in || 3600);
    const mustChangePassword = auth.data.user.user_metadata?.must_change_password === true;
    const redirect = mustChangePassword
      ? "/administrativo/alterar-senha"
      : safeRedirectPath(body.redirect, ["admin","supervisor","operator"].includes(profile.role) ? "/administrativo" : "/administrativo/login");

    return jsonNoStore({ ok: true, redirect });
  } catch {
    return jsonNoStore({ error: "Não foi possível concluir o acesso." }, 400);
  }
}
