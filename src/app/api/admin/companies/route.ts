import { NextRequest } from "next/server";
import { assertSameOrigin, jsonNoStore } from "@/lib/auth/security";
import { requireManager } from "@/lib/auth/session";
import { isValidCnpj, normalizeCnpj } from "@/lib/cnpj";
import { supabaseFetch } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireManager();
  if (!session || session.profile.role !== "admin") return jsonNoStore({ error: "Somente administradores podem cadastrar empresas." }, 403);
  const body = (await request.json()) as Record<string, unknown>;
  const legalName = String(body.legalName || "").trim().slice(0, 160);
  const displayName = String(body.displayName || "").trim().slice(0, 120);
  const taxId = normalizeCnpj(body.taxId) || null;
  if (!legalName || !displayName) return jsonNoStore({ error: "Preencha razão social e nome da empresa." }, 400);
  if (taxId && !isValidCnpj(taxId)) return jsonNoStore({ error: "Informe um CNPJ válido." }, 400);
  const result = await supabaseFetch<Array<{id:string}>>("/rest/v1/companies?select=id", {
    method: "POST", serviceRole:true,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ legal_name: legalName, display_name: displayName, tax_id: taxId }),
  });
  if (!result.response.ok) return jsonNoStore({ error: "Não foi possível cadastrar a empresa." }, 400);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"company.created",entity_table:"companies",entity_id:result.data?.[0]?.id})});
  return jsonNoStore({ ok: true }, 201);
}
