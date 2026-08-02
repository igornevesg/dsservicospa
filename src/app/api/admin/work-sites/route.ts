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
  const result = await supabaseFetch<Array<{id:string;public_id:string}>>("/rest/v1/work_sites?select=id,public_id", {
    method: "POST", serviceRole:true, headers: { Prefer: "return=representation" },
    body: JSON.stringify({ company_id: company.data[0].id, name, address, latitude, longitude, allowed_radius_meters: radius }),
  });
  if (!result.response.ok) return jsonNoStore({ error: "Não foi possível cadastrar o posto." }, 400);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"work_site.created",entity_table:"work_sites",entity_id:result.data?.[0]?.id})});
  return jsonNoStore({ ok: true, publicId: result.data?.[0]?.public_id }, 201);
}

export async function PATCH(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireManager();
  if (!session) return jsonNoStore({ error: "Acesso negado." }, 403);
  const body = (await request.json()) as Record<string, unknown>;
  const publicId = String(body.publicId || "");
  const companyPublicId = String(body.companyId || "");
  const name = String(body.name || "").trim().slice(0, 120);
  const address = String(body.address || "").trim().slice(0, 300) || null;
  const latitude = body.latitude === "" ? null : Number(body.latitude);
  const longitude = body.longitude === "" ? null : Number(body.longitude);
  const radius = Number(body.radius || 150);
  if (!/^[a-f0-9]{24}$/.test(publicId) || !companyPublicId || !name || !Number.isInteger(radius) || radius < 20 || radius > 2000) return jsonNoStore({ error: "Dados do posto inválidos." }, 400);
  if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return jsonNoStore({ error: "Latitude ou longitude inválida." }, 400);
  const [currentResult,companyResult] = await Promise.all([
    supabaseFetch<Array<{id:string;company_id:string;name:string;address:string|null;latitude:number|null;longitude:number|null;allowed_radius_meters:number}>>(`/rest/v1/work_sites?select=id,company_id,name,address,latitude,longitude,allowed_radius_meters&public_id=eq.${publicId}&is_active=eq.true&limit=1`, { token:session.token }),
    supabaseFetch<Array<{id:string}>>(`/rest/v1/companies?select=id&public_id=eq.${companyPublicId}&is_active=eq.true&limit=1`, { token:session.token }),
  ]);
  const site = currentResult.data?.[0]; const company = companyResult.data?.[0];
  if (!site || !company) return jsonNoStore({ error: "Posto ou empresa não encontrado." }, 404);
  const update = await supabaseFetch(`/rest/v1/work_sites?id=eq.${site.id}`, { method:"PATCH", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({company_id:company.id,name,address,latitude,longitude,allowed_radius_meters:radius}) });
  if (!update.response.ok) return jsonNoStore({ error: "Não foi possível editar o posto. Verifique se o nome já existe na empresa." }, 409);
  await supabaseFetch("/rest/v1/audit_logs", { method:"POST", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({actor_user_id:session.user.id,action:"work_site.updated",entity_table:"work_sites",entity_id:site.id,metadata:{previous:{company_id:site.company_id,name:site.name,address:site.address,latitude:site.latitude,longitude:site.longitude,radius:site.allowed_radius_meters},updated:{company_id:company.id,name,address,latitude,longitude,radius}}}) });
  return jsonNoStore({ ok:true, publicId });
}

export async function DELETE(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return jsonNoStore({ error: "Requisição inválida." }, 403); }
  const session = await requireManager();
  if (!session) return jsonNoStore({ error: "Acesso negado." }, 403);
  const publicId = request.nextUrl.searchParams.get("publicId") || "";
  if (!/^[a-f0-9]{24}$/.test(publicId)) return jsonNoStore({ error: "Posto inválido." }, 400);

  const current = await supabaseFetch<Array<{id:string;name:string}>>(`/rest/v1/work_sites?select=id,name&public_id=eq.${publicId}&is_active=eq.true&limit=1`, { token:session.token });
  const site = current.data?.[0];
  if (!site) return jsonNoStore({ error: "Posto não encontrado ou fora do seu acesso." }, 404);

  const linked = await supabaseFetch<Array<{id:string}>>(`/rest/v1/employees?select=id&default_work_site_id=eq.${site.id}&status=eq.active&limit=1`, { serviceRole:true });
  if (linked.data?.[0]) return jsonNoStore({ error: "O posto possui funcionários ativos. Remova ou transfira esses funcionários primeiro." }, 409);

  const update = await supabaseFetch(`/rest/v1/work_sites?id=eq.${site.id}`, { method:"PATCH", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({is_active:false}) });
  if (!update.response.ok) return jsonNoStore({ error: "Não foi possível remover o posto." }, 400);
  await supabaseFetch("/rest/v1/audit_logs", { method:"POST", serviceRole:true, headers:{Prefer:"return=minimal"}, body:JSON.stringify({actor_user_id:session.user.id,action:"work_site.deactivated",entity_table:"work_sites",entity_id:site.id,metadata:{name:site.name}}) });
  return jsonNoStore({ ok:true });
}
