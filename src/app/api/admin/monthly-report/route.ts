import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/auth/security";
import { auditTimeEntry, SheetReference } from "@/lib/manual-sheets/audit";
import { supabaseFetch } from "@/lib/supabase/server";

type Row={public_id:string;batch_id:string;work_date:string;occurrence:string;clock_in:string|null;break_start:string|null;break_end:string|null;clock_out:string|null;employees:{public_id:string;full_name:string;registration_number:string|null;shift_pattern:string|null;companies:{public_id:string;display_name:string}|null}|null;work_sites:{public_id:string;name:string}|null;manual_sheet_batches:{status:string}|null};
type Extracted={batch_id:string;structured_result:{rows?:Array<{employeePublicId:string|null;employeeNameRead:string;workDate:string;occurrence:string;clockIn:string|null;breakStart:string|null;breakEnd:string|null;clockOut:string|null}>}|null};
const validMonth=/^\d{4}-(0[1-9]|1[0-2])$/;
function nextMonth(month:string){const [year,value]=month.split("-").map(Number);return value===12?`${year+1}-01`:`${year}-${String(value+1).padStart(2,"0")}`;}
function point(value:string|null){if(!value)return null;const [hour,minute]=value.slice(0,5).split(":").map(Number);return hour*60+minute;}
function span(start:string|null,end:string|null){const a=point(start),b=point(end);if(a===null||b===null)return 0;return b>=a?b-a:b+1440-a;}
function iso(date:string,time:string|null){return time?`${date}T${time.slice(0,5)}:00-03:00`:null;}

export async function GET(request:NextRequest){
  const session=await requireStaff();if(!session)return jsonNoStore({error:"Acesso não autorizado."},403);
  const month=request.nextUrl.searchParams.get("month")||"";if(!validMonth.test(month))return jsonNoStore({error:"Competência inválida."},400);
  const [result,batchesResult]=await Promise.all([
    supabaseFetch<Row[]>(`/rest/v1/manual_time_entries?select=public_id,batch_id,work_date,occurrence,clock_in,break_start,break_end,clock_out,employees(public_id,full_name,registration_number,shift_pattern,companies(public_id,display_name)),work_sites(public_id,name),manual_sheet_batches!inner(status)&work_date=gte.${month}-01&work_date=lt.${nextMonth(month)}-01&order=work_date&limit=5000`,{token:session.token}),
    supabaseFetch<Array<{id:string}>>(`/rest/v1/manual_sheet_batches?select=id&competence=eq.${month}-01`,{token:session.token}),
  ]);
  if(!result.response.ok||!batchesResult.response.ok)return jsonNoStore({error:"Não foi possível gerar o fechamento das folhas."},500);
  const batchIds=(batchesResult.data||[]).map(item=>item.id);
  const extractionResult=batchIds.length?await supabaseFetch<Extracted[]>(`/rest/v1/manual_sheet_extractions?select=batch_id,structured_result&status=eq.confirmed&batch_id=in.(${batchIds.join(",")})`,{token:session.token}):{data:[] as Extracted[]};
  const references=new Map<string,SheetReference&{employeeName:string;workDate:string}>();
  for(const extraction of extractionResult.data||[])for(const row of extraction.structured_result?.rows||[])if(row.employeePublicId&&row.workDate)references.set(`${extraction.batch_id}:${row.employeePublicId}:${row.workDate}`,{...row,employeeName:row.employeeNameRead});
  const seen=new Set<string>();const inconsistencies:Array<{key:string;date:string;employee:string;messages:string[];source:"system"|"paper"}>=[];
  const days=(result.data||[]).map(row=>{
    const employee=row.employees;const referenceKey=`${row.batch_id}:${employee?.public_id||""}:${row.work_date}`;const reference=references.get(referenceKey);seen.add(referenceKey);
    const issues=auditTimeEntry({occurrence:row.occurrence,clockIn:row.clock_in,breakStart:row.break_start,breakEnd:row.break_end,clockOut:row.clock_out,shiftPattern:employee?.shift_pattern},reference);
    if(issues.length)inconsistencies.push({key:row.public_id,date:row.work_date,employee:employee?.full_name||"Funcionário não identificado",messages:issues,source:"system"});
    const worked=row.occurrence==="worked";const complete=!worked||Boolean(row.clock_in&&row.clock_out&&((row.break_start&&row.break_end)||(!row.break_start&&!row.break_end)));
    const total=worked?span(row.clock_in,row.clock_out)-span(row.break_start,row.break_end):0;
    return{key:row.public_id,date:row.work_date,employee:row.employees,site:row.work_sites,times:{clock_in:iso(row.work_date,row.clock_in),break_start:iso(row.work_date,row.break_start),break_end:iso(row.work_date,row.break_end),clock_out:iso(row.work_date,row.clock_out)},workedMinutes:Math.max(0,total),breakMinutes:span(row.break_start,row.break_end),complete:complete&&!issues.length,rejectedAttempts:0,adjustedEvents:[],occurrence:row.occurrence,batchStatus:row.manual_sheet_batches?.status,inconsistencies:issues};
  });
  for(const [referenceKey,reference] of references)if(!seen.has(referenceKey))inconsistencies.push({key:`paper-${referenceKey}`,date:reference.workDate,employee:reference.employeeName||"Funcionário da folha",messages:["Registro existente na folha assinada, mas ausente nos lançamentos do sistema."],source:"paper"});
  return jsonNoStore({month,days,inconsistencies,truncated:(result.data||[]).length===5000,source:"manual_sheet"});
}
