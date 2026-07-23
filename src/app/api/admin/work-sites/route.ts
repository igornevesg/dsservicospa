import { NextRequest } from "next/server";
import { assertSameOrigin, jsonNoStore } from "@/lib/auth/security";
import { requireManager } from "@/lib/auth/session";
import { supabaseFetch } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireManager();
  if (!session) return jsonNoStore({ error: "Acesso negado." }, 403);
  const body = (await request.json()) as Record<string, unknown>;
  const companyId = String(body.companyId || "");
  const name = String(body.name || "").trim().slice(0, 120);
  const address = String(body.address || "").trim().slice(0, 300) || null;
  const latitude = body.latitude === "" ? null : Number(body.latitude);
  const longitude = body.longitude === "" ? null : Number(body.longitude);
  const radius = Number(body.radius || 150);
  if (!companyId || !name || !Number.isInteger(radius) || radius < 20 || radius > 2000) return jsonNoStore({ error: "Dados do posto inválidos." }, 400);

  const company = await supabaseFetch<Array<{ id: string }>>(`/rest/v1/companies?select=id&public_id=eq.${encodeURIComponent(companyId)}&limit=1`, { token: session.token });
  if (!company.response.ok || !company.data?.[0]) return jsonNoStore({ error: "Empresa inválida." }, 400);
  const result = await supabaseFetch<Array<{id:string}>>("/rest/v1/work_sites?select=id", {
    method: "POST", serviceRole:true, headers: { Prefer: "return=representation" },
    body: JSON.stringify({ company_id: company.data[0].id, name, address, latitude, longitude, allowed_radius_meters: radius }),
  });
  if (!result.response.ok) return jsonNoStore({ error: "Não foi possível cadastrar o posto." }, 400);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"work_site.created",entity_table:"work_sites",entity_id:result.data?.[0]?.id})});
  return jsonNoStore({ ok: true }, 201);
}
