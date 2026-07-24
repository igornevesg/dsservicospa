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
  const result = await supabaseFetch<Array<{id:string;public_id:string}>>("/rest/v1/companies?select=id,public_id", {
    method: "POST", serviceRole:true,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ legal_name: legalName, display_name: displayName, tax_id: taxId }),
  });
  if (!result.response.ok) return jsonNoStore({ error: "Não foi possível cadastrar a empresa." }, 400);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"company.created",entity_table:"companies",entity_id:result.data?.[0]?.id})});
  return jsonNoStore({ ok: true, publicId: result.data?.[0]?.public_id }, 201);
}

export async function DELETE(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireManager();
  if (!session || session.profile.role !== "admin") return jsonNoStore({ error: "Somente administradores podem remover empresas." }, 403);
  const publicId = request.nextUrl.searchParams.get("publicId") || "";
  if (!/^[a-f0-9]{24}$/.test(publicId)) return jsonNoStore({ error: "Empresa inválida." }, 400);

  const current = await supabaseFetch<Array<{id:string;display_name:string}>>(`/rest/v1/companies?select=id,display_name&public_id=eq.${publicId}&is_active=eq.true&limit=1`, { token: session.token });
  const company = current.data?.[0];
  if (!company) return jsonNoStore({ error: "Empresa não encontrada." }, 404);

  const [site, employee] = await Promise.all([
    supabaseFetch<Array<{id:string}>>(`/rest/v1/work_sites?select=id&company_id=eq.${company.id}&is_active=eq.true&limit=1`, { serviceRole:true }),
    supabaseFetch<Array<{id:string}>>(`/rest/v1/employees?select=id&company_id=eq.${company.id}&status=eq.active&limit=1`, { serviceRole:true }),
  ]);
  if (site.data?.[0] || employee.data?.[0]) {
    return jsonNoStore({ error: "A empresa possui postos ou funcionários ativos. Remova esses vínculos primeiro." }, 409);
  }

  const update = await supabaseFetch(`/rest/v1/companies?id=eq.${company.id}`, { method:"PATCH", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({is_active:false}) });
  if (!update.response.ok) return jsonNoStore({ error: "Não foi possível remover a empresa." }, 400);
  await supabaseFetch("/rest/v1/audit_logs", { method:"POST", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({actor_user_id:session.user.id,action:"company.deactivated",entity_table:"companies",entity_id:company.id,metadata:{display_name:company.display_name}}) });
  return jsonNoStore({ ok:true });
}
