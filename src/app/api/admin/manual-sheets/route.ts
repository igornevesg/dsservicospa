import { createHash,randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { assertSameOrigin,jsonNoStore } from "@/lib/auth/security";
import { requireStaff } from "@/lib/auth/session";
import { getServerSupabaseConfig,supabaseFetch } from "@/lib/supabase/server";

export async function GET(){
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const result=await supabaseFetch("/rest/v1/manual_sheet_batches?select=public_id,competence,status,original_filename,created_at,notes,companies(public_id,display_name),work_sites(public_id,name)&order=competence.desc,created_at.desc&limit=100",{token:session.token});
  if(!result.response.ok)return jsonNoStore({error:"Não foi possível carregar as folhas."},500);
  return jsonNoStore({batches:result.data||[]});
}

export async function PUT(request:NextRequest){
  try{assertSameOrigin(request);}catch{return jsonNoStore({error:"Origem inválida."},403);}
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const body=await request.json() as Record<string,unknown>;const companyPublicId=String(body.companyId||"");const sitePublicId=String(body.siteId||"");const month=String(body.month||"");
  if(!/^[a-f0-9]{24}$/.test(companyPublicId)||!/^[a-f0-9]{24}$/.test(sitePublicId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return jsonNoStore({error:"Empresa, posto ou competência inválidos."},400);
  const [companyResult,siteResult]=await Promise.all([
    supabaseFetch<Array<{id:string}>>(`/rest/v1/companies?select=id&public_id=eq.${companyPublicId}&limit=1`,{token:session.token}),
    supabaseFetch<Array<{id:string;company_id:string}>>(`/rest/v1/work_sites?select=id,company_id&public_id=eq.${sitePublicId}&limit=1`,{token:session.token}),
  ]);const company=companyResult.data?.[0],site=siteResult.data?.[0];if(!company||!site||site.company_id!==company.id)return jsonNoStore({error:"Empresa ou posto fora do seu acesso."},403);
  const existing=await supabaseFetch<Array<{id:string;public_id:string}>>(`/rest/v1/manual_sheet_batches?select=id,public_id&company_id=eq.${company.id}&work_site_id=eq.${site.id}&competence=eq.${month}-01&limit=1`,{token:session.token});
  if(existing.data?.[0])return jsonNoStore({ok:true,publicId:existing.data[0].public_id});
  const insert=await supabaseFetch<Array<{id:string;public_id:string}>>("/rest/v1/manual_sheet_batches?select=id,public_id",{method:"POST",serviceRole:true,headers:{Prefer:"return=representation"},body:JSON.stringify({company_id:company.id,work_site_id:site.id,competence:`${month}-01`,created_by:session.user.id})});const batch=insert.data?.[0];
  if(!insert.response.ok||!batch)return jsonNoStore({error:"Não foi possível iniciar esta competência."},409);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"manual_sheet.started_before_document",entity_table:"manual_sheet_batches",entity_id:batch.id,metadata:{month}})});
  return jsonNoStore({ok:true,publicId:batch.public_id},201);
}

export async function POST(request:NextRequest){
  try{assertSameOrigin(request);}catch{return jsonNoStore({error:"Origem inválida."},403);}
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const form=await request.formData();const file=form.get("document");const companyPublicId=String(form.get("companyId")||"");const sitePublicId=String(form.get("siteId")||"");const month=String(form.get("month")||"");const notes=String(form.get("notes")||"").trim().slice(0,1000)||null;
  if(!(file instanceof File)||file.size<100||file.size>10_485_760||!["application/pdf","image/jpeg","image/png"].includes(file.type)||!/^[a-f0-9]{24}$/.test(companyPublicId)||!/^[a-f0-9]{24}$/.test(sitePublicId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return jsonNoStore({error:"Documento, empresa, posto ou competência inválidos."},400);
  const [companyResult,siteResult]=await Promise.all([
    supabaseFetch<Array<{id:string}>>(`/rest/v1/companies?select=id&public_id=eq.${companyPublicId}&limit=1`,{token:session.token}),
    supabaseFetch<Array<{id:string;company_id:string}>>(`/rest/v1/work_sites?select=id,company_id&public_id=eq.${sitePublicId}&limit=1`,{token:session.token}),
  ]);const company=companyResult.data?.[0];const site=siteResult.data?.[0];if(!company||!site||site.company_id!==company.id)return jsonNoStore({error:"Empresa ou posto fora do seu acesso."},403);
  const existing=await supabaseFetch<Array<{id:string;public_id:string;document_path:string|null}>>(`/rest/v1/manual_sheet_batches?select=id,public_id,document_path&company_id=eq.${company.id}&work_site_id=eq.${site.id}&competence=eq.${month}-01&limit=1`,{token:session.token});let batch=existing.data?.[0];
  if(batch?.document_path)return jsonNoStore({error:"Já existe uma folha anexada para esta empresa, posto e competência."},409);
  const bytes=Buffer.from(await file.arrayBuffer());const hash=createHash("sha256").update(bytes).digest("hex");const extension=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":"jpg";const path=`${company.id}/${month}/${randomUUID()}.${extension}`;
  const {url,serviceRoleKey}=getServerSupabaseConfig();if(!serviceRoleKey)return jsonNoStore({error:"Armazenamento não configurado."},500);
  const upload=await fetch(`${url}/storage/v1/object/manual-time-sheets/${path}`,{method:"POST",headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":file.type,"x-upsert":"false"},body:new Uint8Array(bytes)});
  if(!upload.ok)return jsonNoStore({error:"Não foi possível armazenar a folha."},500);
  if(batch){
    const update=await supabaseFetch(`/rest/v1/manual_sheet_batches?id=eq.${batch.id}`,{method:"PATCH",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({document_path:path,original_filename:file.name.slice(0,240),document_mime:file.type,document_sha256:hash,notes})});
    if(!update.response.ok)return jsonNoStore({error:"Não foi possível vincular a folha aos lançamentos existentes."},409);
  }else{
    const insert=await supabaseFetch<Array<{id:string;public_id:string;document_path:string|null}>>("/rest/v1/manual_sheet_batches?select=id,public_id,document_path",{method:"POST",serviceRole:true,headers:{Prefer:"return=representation"},body:JSON.stringify({company_id:company.id,work_site_id:site.id,competence:`${month}-01`,document_path:path,original_filename:file.name.slice(0,240),document_mime:file.type,document_sha256:hash,notes,created_by:session.user.id})});batch=insert.data?.[0];
    if(!insert.response.ok||!batch)return jsonNoStore({error:"Esta folha já foi enviada ou não pôde ser cadastrada."},409);
  }
  if(!batch)return jsonNoStore({error:"Não foi possível identificar a competência."},500);
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"manual_sheet.created",entity_table:"manual_sheet_batches",entity_id:batch.id,metadata:{sha256:hash,month}})});
  return jsonNoStore({ok:true,publicId:batch.public_id},201);
}
