import { NextRequest } from "next/server";
import { assertSameOrigin,jsonNoStore } from "@/lib/auth/security";
import { requireStaff } from "@/lib/auth/session";
import { extractManualSheet,ExtractedRow } from "@/lib/manual-sheets/openai";
import { downloadManualSheet } from "@/lib/manual-sheets/storage";
import { supabaseFetch } from "@/lib/supabase/server";

type Context={params:Promise<{publicId:string}>};
type Batch={id:string;company_id:string;competence:string;document_path:string|null;document_mime:string|null;original_filename:string|null;status:string};
const occurrences=new Set(["worked","absence","day_off","medical_leave","vacation","holiday","other"]);

async function batchFor(publicId:string,token:string){
  const result=await supabaseFetch<Batch[]>(`/rest/v1/manual_sheet_batches?select=id,company_id,competence,document_path,document_mime,original_filename,status&public_id=eq.${publicId}&limit=1`,{token});
  return result.data?.[0];
}

export async function GET(_request:NextRequest,context:Context){
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const {publicId}=await context.params;const batch=await batchFor(publicId,session.token);if(!batch)return jsonNoStore({error:"Folha não encontrada."},404);
  const result=await supabaseFetch(`/rest/v1/manual_sheet_extractions?select=public_id,status,model,structured_result,error_message,created_at,confirmed_at&batch_id=eq.${batch.id}&order=created_at.desc&limit=1`,{token:session.token});
  return jsonNoStore({extraction:Array.isArray(result.data)?result.data[0]||null:null});
}

export async function POST(request:NextRequest,context:Context){
  try{assertSameOrigin(request);}catch{return jsonNoStore({error:"Origem inválida."},403);}
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const actorId=session.user.id as string;
  const {publicId}=await context.params;const batch=await batchFor(publicId,session.token);if(!batch||batch.status!=="draft"||!batch.document_path||!batch.document_mime||!batch.original_filename)return jsonNoStore({error:"Anexe a folha antes de solicitar a leitura automática."},409);
  const employeesResult=await supabaseFetch<Array<{public_id:string;full_name:string;registration_number:string|null}>>(`/rest/v1/employees?select=public_id,full_name,registration_number&company_id=eq.${batch.company_id}&status=eq.active&order=full_name`,{token:session.token});
  const model=process.env.OPENAI_OCR_MODEL||"gpt-5.6-terra";
  const created=await supabaseFetch<Array<{id:string;public_id:string}>>("/rest/v1/manual_sheet_extractions?select=id,public_id",{method:"POST",serviceRole:true,headers:{Prefer:"return=representation"},body:JSON.stringify({batch_id:batch.id,status:"processing",model,created_by:actorId})});
  const record=created.data?.[0];if(!record)return jsonNoStore({error:"Não foi possível iniciar a leitura."},500);
  try{
    const bytes=await downloadManualSheet(batch.document_path);
    const result=await extractManualSheet({bytes,mime:batch.document_mime,filename:batch.original_filename,month:batch.competence.slice(0,7),employees:employeesResult.data||[]});
    await supabaseFetch(`/rest/v1/manual_sheet_extractions?id=eq.${record.id}`,{method:"PATCH",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"review",model:result.model,structured_result:result.parsed})});
    await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:actorId,action:"manual_sheet.extracted_for_review",entity_table:"manual_sheet_extractions",entity_id:record.id,metadata:{rows:result.parsed.rows.length}})});
    return jsonNoStore({publicId:record.public_id,status:"review",structured_result:result.parsed});
  }catch(reason){
    const message=reason instanceof Error?reason.message:"Falha na leitura automática.";
    await supabaseFetch(`/rest/v1/manual_sheet_extractions?id=eq.${record.id}`,{method:"PATCH",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:message.slice(0,500)})});
    return jsonNoStore({error:message},503);
  }
}

export async function PATCH(request:NextRequest,context:Context){
  try{assertSameOrigin(request);}catch{return jsonNoStore({error:"Origem inválida."},403);}
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const actorId=session.user.id as string;
  const {publicId}=await context.params;const batch=await batchFor(publicId,session.token);if(!batch||batch.status!=="draft")return jsonNoStore({error:"Folha indisponível."},409);
  const body=await request.json() as {extractionId?:string;rows?:Array<ExtractedRow&{include?:boolean}>};const rows=(body.rows||[]).filter(row=>row.include!==false);
  if(!/^[a-f0-9]{24}$/.test(String(body.extractionId||""))||!rows.length||rows.length>200)return jsonNoStore({error:"Revisão inválida."},400);
  const extractionResult=await supabaseFetch<Array<{id:string;status:string}>>(`/rest/v1/manual_sheet_extractions?select=id,status&public_id=eq.${body.extractionId}&batch_id=eq.${batch.id}&limit=1`,{token:session.token});
  const extraction=extractionResult.data?.[0];if(!extraction||extraction.status!=="review")return jsonNoStore({error:"Leitura já confirmada ou inválida."},409);
  const employeeIds=[...new Set(rows.map(row=>row.employeePublicId).filter(Boolean))] as string[];
  const employeesResult=await supabaseFetch<Array<{id:string;public_id:string;company_id:string}>>(`/rest/v1/employees?select=id,public_id,company_id&public_id=in.(${employeeIds.join(",")})`,{token:session.token});
  const employees=new Map((employeesResult.data||[]).map(e=>[e.public_id,e]));
  const values:string[]=[];const normalized:Array<{batch_id:string;employee_id:string;company_id:string;work_site_id:string;work_date:string;occurrence:string;clock_in:string|null;break_start:string|null;break_end:string|null;clock_out:string|null;notes:string|null;created_by:string;updated_by:string}>=[];
  for(const row of rows){
    const employee=row.employeePublicId?employees.get(row.employeePublicId):null;
    const time=(value:string|null)=>value&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?value:null;
    if(!employee||employee.company_id!==batch.company_id||!row.workDate?.startsWith(batch.competence.slice(0,7))||!occurrences.has(row.occurrence))return jsonNoStore({error:"Revise funcionário, data e ocorrência de todos os itens."},400);
    const clockIn=time(row.clockIn),clockOut=time(row.clockOut);if(row.occurrence==="worked"&&(!clockIn||!clockOut))return jsonNoStore({error:"Dias trabalhados exigem entrada e saída."},400);
    values.push(`${employee.id}:${row.workDate}`);normalized.push({batch_id:batch.id,employee_id:employee.id,company_id:batch.company_id,work_site_id:"",work_date:row.workDate,occurrence:row.occurrence,clock_in:clockIn,break_start:time(row.breakStart),break_end:time(row.breakEnd),clock_out:clockOut,notes:row.warning?`Leitura assistida: ${row.warning}`:null,created_by:actorId,updated_by:actorId});
  }
  const batchDetails=await supabaseFetch<Array<{work_site_id:string}>>(`/rest/v1/manual_sheet_batches?select=work_site_id&id=eq.${batch.id}`,{token:session.token});const siteId=batchDetails.data?.[0]?.work_site_id;if(!siteId)return jsonNoStore({error:"Posto da folha não encontrado."},409);
  normalized.forEach(row=>{row.work_site_id=siteId;});
  const existingResult=await supabaseFetch<Array<{employee_id:string;work_date:string}>>(`/rest/v1/manual_time_entries?select=employee_id,work_date&batch_id=eq.${batch.id}`,{token:session.token});
  if(!existingResult.response.ok)return jsonNoStore({error:"Não foi possível comparar a folha com os lançamentos diários."},500);
  const existingKeys=new Set((existingResult.data||[]).map(item=>`${item.employee_id}:${item.work_date}`));
  const missing=normalized.filter(item=>!existingKeys.has(`${item.employee_id}:${item.work_date}`));
  if(missing.length){const insert=await supabaseFetch("/rest/v1/manual_time_entries",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify(missing)});if(!insert.response.ok)return jsonNoStore({error:"Não foi possível importar os lançamentos ausentes da folha."},409);}
  await supabaseFetch(`/rest/v1/manual_sheet_extractions?id=eq.${extraction.id}`,{method:"PATCH",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"confirmed",confirmed_by:actorId,confirmed_at:new Date().toISOString(),structured_result:{rows}})});
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:actorId,action:"manual_sheet.extraction_confirmed",entity_table:"manual_sheet_extractions",entity_id:extraction.id,metadata:{rows:normalized.length,keys:values}})});
  return jsonNoStore({ok:true,inserted:missing.length,compared:normalized.length-missing.length});
}
