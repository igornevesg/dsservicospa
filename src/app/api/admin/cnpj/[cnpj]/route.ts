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
  situacao_cadastral?: unknown;
  tipo_logradouro?: unknown;
  logradouro?: unknown;
  numero?: unknown;
  complemento?: unknown;
  bairro?: unknown;
  municipio?: unknown;
  uf?: unknown;
  cep?: unknown;
};

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function companyPayload(payload: BrasilApiCompany) {
  const legalName = text(payload.razao_social).slice(0, 160);
  const tradeName = text(payload.nome_fantasia).slice(0, 120);
  const status = (text(payload.descricao_situacao_cadastral) || text(payload.situacao_cadastral)).slice(0, 80);
  const street = [text(payload.tipo_logradouro), text(payload.logradouro)].filter(Boolean).join(" ");
  const address = [street, text(payload.numero), text(payload.complemento), text(payload.bairro), text(payload.municipio), text(payload.uf), text(payload.cep)].filter(Boolean).join(", ").slice(0, 240);
  return { legalName, tradeName, status, address };
}

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
    const sources = [`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, `https://api.opencnpj.org/${cnpj}`];
    for (const url of sources) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "DS-Servicos/1.0" }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
        if (!response.ok) continue;
        const data = companyPayload((await response.json()) as BrasilApiCompany);
        if (data.legalName) return jsonNoStore({ cnpj, ...data });
      } catch { continue; }
    }
    return jsonNoStore({ error: "CNPJ não encontrado nas bases consultadas." }, 404);
  } catch {
    return jsonNoStore(
      { error: "A consulta de CNPJ está indisponível no momento. Preencha os dados manualmente." },
      503,
    );
  }
}
