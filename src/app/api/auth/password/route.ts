import { NextRequest } from "next/server";
import { assertSameOrigin, jsonNoStore, strongPassword } from "@/lib/auth/security";
import { requireUser } from "@/lib/auth/session";
import { supabaseFetch } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireUser();
  if (!session) return jsonNoStore({ error: "Sessão expirada." }, 401);
  const body = (await request.json()) as { password?: unknown };
  if (!strongPassword(body.password)) {
    return jsonNoStore({ error: "Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." }, 400);
  }
  const result = await supabaseFetch("/auth/v1/user", {
    method: "PUT",
    token: session.token,
    body: JSON.stringify({ password: body.password, data: { must_change_password: false } }),
  });
  if (!result.response.ok) return jsonNoStore({ error: "Não foi possível alterar a senha." }, 400);
  return jsonNoStore({ ok: true });
}
