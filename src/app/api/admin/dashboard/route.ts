import { jsonNoStore } from "@/lib/auth/security";
import { requireUser } from "@/lib/auth/session";
import { supabaseFetch } from "@/lib/supabase/server";

async function count(path: string, token: string) {
  const result = await supabaseFetch<unknown[]>(path, {
    token,
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  const range = result.response.headers.get("content-range") || "";
  return Number(range.split("/")[1] || 0);
}

export async function GET() {
  const session = await requireUser();
  if (!session) return jsonNoStore({ error: "Sua sessão expirou. Entre novamente.", code:"SESSION_EXPIRED" }, 401);
  if(!["admin","supervisor","operator"].includes(session.profile.role))return jsonNoStore({error:`O perfil ${session.profile.role} não possui acesso administrativo. Entre com a conta administradora.`,code:"ROLE_DENIED",role:session.profile.role},403);

  const [companies, sites, employees, supervisors, companyRows, siteRows, employeeRows, supervisorRows] = await Promise.all([
    count("/rest/v1/companies?select=id&is_active=eq.true", session.token),
    count("/rest/v1/work_sites?select=id&is_active=eq.true", session.token),
    count("/rest/v1/employees?select=id&status=eq.active", session.token),
    count("/rest/v1/profiles?select=id&role=eq.supervisor&is_active=eq.true", session.token),
    supabaseFetch("/rest/v1/companies?select=public_id,display_name,legal_name,tax_id,is_active&is_active=eq.true&order=display_name", { token: session.token }),
    supabaseFetch("/rest/v1/work_sites?select=public_id,name,address,latitude,longitude,allowed_radius_meters,is_active,companies(display_name,public_id)&is_active=eq.true&order=name", { token: session.token }),
    supabaseFetch("/rest/v1/employees?select=public_id,full_name,registration_number,corporate_email,cpf_last4,phone,job_title,shift_pattern,status,companies(display_name,public_id),work_sites!employees_default_work_site_id_fkey(name,public_id)&status=eq.active&order=full_name", { token: session.token }),
    supabaseFetch("/rest/v1/profiles?select=id,full_name,role,is_active,company_id,companies(display_name,public_id)&role=eq.supervisor&order=full_name", { token: session.token }),
  ]);

  return jsonNoStore({
    role: session.profile.role,
    companyId: session.profile.company_id,
    counts: { companies, sites, employees, supervisors },
    companies: companyRows.data,
    sites: siteRows.data,
    employees: employeeRows.data,
    supervisors: supervisorRows.data,
  });
}
