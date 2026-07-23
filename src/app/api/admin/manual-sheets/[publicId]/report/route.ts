import { NextRequest } from "next/server";
import { PDFDocument,StandardFonts,rgb } from "pdf-lib";
import { requireStaff } from "@/lib/auth/session";
import { downloadManualSheet } from "@/lib/manual-sheets/storage";
import { supabaseFetch } from "@/lib/supabase/server";

type Context={params:Promise<{publicId:string}>};
type Batch={id:string;document_path:string|null;document_mime:string|null;original_filename:string|null;competence:string;companies:{display_name:string}|null;work_sites:{name:string}|null};
type Entry={work_date:string;occurrence:string;clock_in:string|null;break_start:string|null;break_end:string|null;clock_out:string|null;employees:{full_name:string;registration_number:string}|null};
const safe=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g,"?");

export async function GET(_request:NextRequest,context:Context){
  const session=await requireStaff();if(!session)return new Response("Acesso não autorizado.",{status:403});
  const {publicId}=await context.params;
  const batchResult=await supabaseFetch<Batch[]>(`/rest/v1/manual_sheet_batches?select=id,document_path,document_mime,original_filename,competence,companies(display_name),work_sites(name)&public_id=eq.${publicId}&limit=1`,{token:session.token});
  const batch=batchResult.data?.[0];if(!batch)return new Response("Competência não encontrada.",{status:404});if(!batch.document_path||!batch.document_mime||!batch.original_filename)return new Response("A folha assinada ainda não foi anexada.",{status:409});
  const entriesResult=await supabaseFetch<Entry[]>(`/rest/v1/manual_time_entries?select=work_date,occurrence,clock_in,break_start,break_end,clock_out,employees(full_name,registration_number)&batch_id=eq.${batch.id}&order=employees(full_name),work_date`,{token:session.token});
  const original=await downloadManualSheet(batch.document_path);
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage([842,595]);let y=550;
  const line=(text:string,size=9,strong=false)=>{if(y<45){page=pdf.addPage([842,595]);y=550;}page.drawText(safe(text),{x:38,y,size,font:strong?bold:font,color:rgb(.08,.18,.28)});y-=size+7;};
  line("DS SERVICOS - RELATORIO DE HORAS",16,true);line(`Empresa: ${batch.companies?.display_name||"-"} | Posto: ${batch.work_sites?.name||"-"}`,10);line(`Competencia: ${batch.competence.slice(0,7)} | Folha original: ${batch.original_filename}`,10);y-=7;
  line("Data       Funcionario / Matricula                    Ocorrencia   Entrada  Almoco  Retorno  Saida",9,true);
  for(const row of entriesResult.data||[])line(`${row.work_date}  ${(row.employees?.full_name||"-").slice(0,34).padEnd(34)} ${(row.employees?.registration_number||"-").slice(0,10).padEnd(10)} ${row.occurrence.padEnd(11)} ${(row.clock_in||"--:--").slice(0,5)}    ${(row.break_start||"--:--").slice(0,5)}   ${(row.break_end||"--:--").slice(0,5)}   ${(row.clock_out||"--:--").slice(0,5)}`,8);
  line(`Total de lancamentos: ${(entriesResult.data||[]).length}`,10,true);line("As paginas seguintes reproduzem a folha manuscrita assinada armazenada no sistema.",9);
  if(batch.document_mime==="application/pdf"){
    const source=await PDFDocument.load(original);const pages=await pdf.copyPages(source,source.getPageIndices());pages.forEach(item=>pdf.addPage(item));
  }else{
    const image=batch.document_mime==="image/png"?await pdf.embedPng(original):await pdf.embedJpg(original);
    const sheet=pdf.addPage([595,842]);const bounds=image.scaleToFit(535,782);sheet.drawImage(image,{x:(595-bounds.width)/2,y:(842-bounds.height)/2,width:bounds.width,height:bounds.height});
  }
  const pages=pdf.getPages();pages.forEach((item,index)=>item.drawText(`${index+1}/${pages.length}`,{x:item.getWidth()-55,y:20,size:8,font,color:rgb(.35,.4,.45)}));
  const bytes=await pdf.save();
  await supabaseFetch("/rest/v1/audit_logs",{method:"POST",serviceRole:true,headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:session.user.id,action:"manual_sheet.report_generated",entity_table:"manual_sheet_batches",entity_id:batch.id})});
  return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="horas-${batch.competence.slice(0,7)}-${publicId}.pdf"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
