import { NextRequest } from "next/server";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { jsonNoStore } from "@/lib/auth/security";
import { requireManager } from "@/lib/auth/session";
import { isValidCnpj, normalizeCnpj } from "@/lib/cnpj";

type Context = { params: Promise<{ cnpj: string }> };
type BrasilApiCompany = {
  cnpj?: unknown;
  razao_social?: unknown;
  nome_fantasia?: unknown;
  descricao_situacao_cadastral?: unknown;
};

export async function GET(request: NextRequest, context: Context) {
  const session = await requireManager();
  if (!session || session.profile.role !== "admin") {
    return jsonNoStore({ error: "Somente administradores podem consultar empresas." }, 403);
  }

  const { cnpj: rawCnpj } = await context.params;
  const cnpj = normalizeCnpj(rawCnpj);
  if (!isValidCnpj(cnpj)) {
    return jsonNoStore({ error: "Informe um CNPJ válido." }, 400);
  }

  const allowed = await consumeRateLimit(request, "cnpj_lookup", session.user.id || session.profile.id, 30, 60 * 60, 15 * 60);
  if (!allowed) {
    return jsonNoStore({ error: "Muitas consultas. Aguarde alguns minutos e tente novamente." }, 429);
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) {
      return jsonNoStore({ error: "CNPJ não encontrado na base consultada." }, 404);
    }
    if (!response.ok) throw new Error("UPSTREAM_ERROR");

    const payload = (await response.json()) as BrasilApiCompany;
    const legalName = typeof payload.razao_social === "string" ? payload.razao_social.trim().slice(0, 160) : "";
    const tradeName = typeof payload.nome_fantasia === "string" ? payload.nome_fantasia.trim().slice(0, 120) : "";
    const status = typeof payload.descricao_situacao_cadastral === "string"
      ? payload.descricao_situacao_cadastral.trim().slice(0, 80)
      : "";

    if (!legalName) throw new Error("INVALID_UPSTREAM_RESPONSE");
    return jsonNoStore({ cnpj, legalName, tradeName, status });
  } catch {
    return jsonNoStore(
      { error: "A consulta de CNPJ está indisponível no momento. Preencha os dados manualmente." },
      503,
    );
  }
}
