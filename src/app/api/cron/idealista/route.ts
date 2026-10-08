import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { TEST_CUSTOMER_CODE } from "@/lib/idealista/feed";
import { ftpConfigured, payloadHash, prepare, readConfig, secretMatches, sendToFtp } from "@/lib/idealista/server";
export const runtime="nodejs";
export const maxDuration=120;
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!hasServiceRole())return NextResponse.json({error:"unavailable"},{status:503});
 const token=request.headers.get("authorization")?.replace(/^Bearer /,"") ?? "";
 if(!token)return NextResponse.json({error:"unauthorized"},{status:401});
 let config=await readConfig(true);
 if(!config || !secretMatches(token,config.sync_secret))return NextResponse.json({error:"unauthorized"},{status:401});
 if(!config.enabled)return NextResponse.json({status:"disabled"});
 if(!config.review_approved || !config.migration_confirmed || !ftpConfigured() || !/^ilc[a-z0-9]{40}$/.test(config.customer_code) || config.customer_code===TEST_CUSTOMER_CODE)return NextResponse.json({error:"not_ready"},{status:409});
 const db=createAdminClient();const lock=randomUUID();
 const {data:claimed,error:claimError}=await db.rpc("claim_idealista_export",{p_token:lock});
 if(claimError)return NextResponse.json({error:"lock_failed"},{status:503});
 if(!claimed)return NextResponse.json({status:"busy_or_throttled"});
 try {
  config=await readConfig(true);
  if(!config?.enabled)return NextResponse.json({status:"disabled"});
  const feed=await prepare(config);
  if(feed.problems.length || feed.schemaErrors.length)throw new Error("Envio bloqueado: há imóveis selecionados com dados inválidos. Consulte Exportações no Helix.");
  if(!feed.count)throw new Error("Sem imóveis elegíveis. O idealista não remove todos os anúncios através de um ficheiro vazio; contacte o apoio para retirar o último anúncio.");
  const hash=payloadHash(feed.payload);
  if(hash===config.last_hash)return NextResponse.json({status:"unchanged"});
  const filename=await sendToFtp(config.customer_code,JSON.stringify(feed.payload,null,2));
  const {error}=await db.from("idealista_export_config").update({last_hash:hash,last_export_at:new Date().toISOString(),last_count:feed.count,last_error:null}).eq("id","housepro").eq("lock_token",lock);
  if(error)throw new Error("Ficheiro transferido, mas o registo do envio falhou. Verifique a receção com o idealista antes de reenviar.");
  return NextResponse.json({status:"uploaded",count:feed.count,filename});
 }catch(error){
  const message=error instanceof Error?error.message:"Falha no envio.";
  await db.from("idealista_export_config").update({last_error:message}).eq("id","housepro").eq("lock_token",lock);
  return NextResponse.json({error:message},{status:503});
 }finally {await db.from("idealista_export_config").update({lock_until:null,lock_token:null}).eq("id","housepro").eq("lock_token",lock);}
}
