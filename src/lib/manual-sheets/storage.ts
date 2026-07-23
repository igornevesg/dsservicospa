import "server-only";
import { getServerSupabaseConfig } from "@/lib/supabase/server";

export async function downloadManualSheet(path:string){
  const {url,serviceRoleKey}=getServerSupabaseConfig();
  if(!serviceRoleKey) throw new Error("Armazenamento não configurado.");
  const response=await fetch(`${url}/storage/v1/object/authenticated/manual-time-sheets/${path}`,{
    headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`},
    cache:"no-store",
  });
  if(!response.ok) throw new Error("Não foi possível acessar a folha original.");
  return Buffer.from(await response.arrayBuffer());
}
