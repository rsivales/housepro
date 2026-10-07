import { createHash, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { Client } from "basic-ftp";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFeed, type FeedConfig, type Listing } from "./feed";

export type Config = FeedConfig & { id:string; agency_id:string; enabled:boolean; review_approved:boolean; migration_confirmed:boolean; last_hash:string|null; last_export_at:string|null; last_count:number; last_error:string|null; sync_secret:string };
const PUBLIC_COLUMNS = "id,agency_id,customer_code,property_ids,overrides,development_service,enabled,review_approved,migration_confirmed,last_hash,last_export_at,last_count,last_error";
export async function readConfig(includeSecret = false): Promise<Config | null> {
 const {data,error} = await createAdminClient().from("idealista_export_config").select(includeSecret ? "*" : PUBLIC_COLUMNS).eq("id","housepro").maybeSingle();
 if (error) throw new Error("Não foi possível ler a configuração do idealista.");
 return data as Config | null;
}
export async function readListings(agencyId:string): Promise<Listing[]> {
 const db = createAdminClient(); const all: Listing[] = [];
 const columns = "id,reference,legacy_reference,title,type,typology,operation,price,area,area_util,land_area,beds,baths,latitude,longitude,approval,listing_state,off_market,status,energy,description,cover_url,gallery,municipality,is_development,development_name,development_stage,garage,elevator,accessible,construction_year,equipment,amenities,location_privacy,agent:profiles!agent_id!inner(name,email,whatsapp,agency_id)";
 for(let start=0;;start+=500) {
  const {data,error} = await db.from("properties").select(columns).eq("agent.agency_id",agencyId).order("id").range(start,start+499);
  if(error) throw new Error("Não foi possível ler todos os imóveis. O envio foi interrompido.");
  all.push(...(data as unknown as Listing[]));
  if((data ?? []).length < 500) return all;
 }
}
export function ftpConfigured() { return Boolean(process.env.IDEALISTA_FTP_HOST && process.env.IDEALISTA_FTP_USER && process.env.IDEALISTA_FTP_PASSWORD); }
export function secretMatches(provided:string, expected:string) {
 const a=Buffer.from(provided); const b=Buffer.from(expected); return a.length === b.length && a.length > 0 && timingSafeEqual(a,b);
}
export function payloadHash(payload:unknown) { return createHash("sha256").update(JSON.stringify(payload)).digest("hex"); }
export async function sendToFtp(customerCode:string, content:string) {
 if(!ftpConfigured()) throw new Error("FTP ainda não configurado.");
 const client=new Client(20000);
 const filename=`${customerCode}_helix_${Date.now()}.json`;
 const temporary=`.${filename}.uploading`;
 try {
  await client.access({ host:process.env.IDEALISTA_FTP_HOST!, user:process.env.IDEALISTA_FTP_USER!, password:process.env.IDEALISTA_FTP_PASSWORD!, port:Number(process.env.IDEALISTA_FTP_PORT || 21), secure:process.env.IDEALISTA_FTP_SECURE !== "false" });
  await client.cd(process.env.IDEALISTA_FTP_DIRECTORY || "/");
  // basic-ftp uses TYPE I (binary). Rename only after the UTF-8 upload completes.
  await client.uploadFrom(Readable.from(Buffer.from(content,"utf8")),temporary);
  await client.rename(temporary,filename);
  return filename;
 } catch { throw new Error("Falha na transferência FTP. Verifique os dados e o serviço com o idealista."); }
 finally { client.close(); }
}
export async function prepare(config:Config) { return buildFeed(await readListings(config.agency_id),config); }
