import "server-only";

export type ExtractedRow={
  employeePublicId:string|null;
  employeeNameRead:string;
  workDate:string;
  occurrence:"worked"|"absence"|"day_off"|"medical_leave"|"vacation"|"holiday"|"other";
  clockIn:string|null;
  breakStart:string|null;
  breakEnd:string|null;
  clockOut:string|null;
  confidence:number;
  warning:string|null;
};

type Employee={public_id:string;full_name:string;registration_number:string|null};

const schema={
  type:"object",additionalProperties:false,
  properties:{
    rows:{type:"array",items:{type:"object",additionalProperties:false,properties:{
      employeePublicId:{type:["string","null"]},employeeNameRead:{type:"string"},workDate:{type:"string"},
      occurrence:{type:"string",enum:["worked","absence","day_off","medical_leave","vacation","holiday","other"]},
      clockIn:{type:["string","null"]},breakStart:{type:["string","null"]},breakEnd:{type:["string","null"]},clockOut:{type:["string","null"]},
      confidence:{type:"number",minimum:0,maximum:1},warning:{type:["string","null"]},
    },required:["employeePublicId","employeeNameRead","workDate","occurrence","clockIn","breakStart","breakEnd","clockOut","confidence","warning"]}},
    warnings:{type:"array",items:{type:"string"}},
  },required:["rows","warnings"],
};

function outputText(payload:Record<string,unknown>){
  if(typeof payload.output_text==="string") return payload.output_text;
  const output=Array.isArray(payload.output)?payload.output:[];
  for(const item of output){
    if(!item||typeof item!=="object")continue;
    const content=Array.isArray((item as {content?:unknown[]}).content)?(item as {content:unknown[]}).content:[];
    for(const part of content){
      if(part&&typeof part==="object"&&typeof (part as {text?:unknown}).text==="string")return (part as {text:string}).text;
    }
  }
  throw new Error("A leitura não retornou dados estruturados.");
}

export async function extractManualSheet(input:{bytes:Buffer;mime:string;filename:string;month:string;employees:Employee[]}){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("Leitura automática não configurada. Defina OPENAI_API_KEY no servidor.");
  const model=process.env.OPENAI_OCR_MODEL||"gpt-5.6-terra";
  let fileId:string|undefined;
  let documentPart:Record<string,string>;
  if(input.mime==="application/pdf"){
    const form=new FormData();
    form.set("purpose","user_data");
    form.set("file",new Blob([new Uint8Array(input.bytes)],{type:input.mime}),input.filename);
    const uploaded=await fetch("https://api.openai.com/v1/files",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`},body:form});
    const body=await uploaded.json() as {id?:string;error?:{message?:string}};
    if(!uploaded.ok||!body.id)throw new Error(body.error?.message||"Não foi possível preparar o PDF para leitura.");
    fileId=body.id;documentPart={type:"input_file",file_id:fileId};
  }else{
    documentPart={type:"input_image",image_url:`data:${input.mime};base64,${input.bytes.toString("base64")}`};
  }
  const roster=input.employees.map(e=>`${e.public_id} | ${e.registration_number||"SEM MATRÍCULA"} | ${e.full_name}`).join("\n");
  const prompt=`Leia esta folha de ponto manuscrita da competência ${input.month}. Extraia somente informações visíveis. Converta datas para YYYY-MM-DD e horários para HH:MM. Relacione employeePublicId apenas quando nome ou matrícula corresponderem com segurança à lista abaixo; caso contrário use null. Não invente horários ilegíveis. Marque baixa confiança e explique em warning. A saída é uma proposta sujeita à revisão humana.\n\nFUNCIONÁRIOS:\n${roster}`;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({
      model,store:false,input:[{role:"user",content:[{type:"input_text",text:prompt},documentPart]}],
      text:{format:{type:"json_schema",name:"manual_time_sheet",strict:true,schema}},
    })});
    const payload=await response.json() as Record<string,unknown>&{error?:{message?:string}};
    if(!response.ok)throw new Error(payload.error?.message||"Falha na leitura automática.");
    const parsed=JSON.parse(outputText(payload)) as {rows:ExtractedRow[];warnings:string[]};
    return {model,parsed};
  }finally{
    if(fileId)void fetch(`https://api.openai.com/v1/files/${fileId}`,{method:"DELETE",headers:{Authorization:`Bearer ${apiKey}`}});
  }
}
