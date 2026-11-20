import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { validEmail } from "@/lib/leads/identity";
/** Operational messages follow the responsible profile. Never guess an address. */
export async function agentRecipients(agentId: string, houseproFallback?: string) {
 const db=createAdminClient();
 const {data:agent}=await db.from("profiles").select("email,active,agency_id").eq("id",agentId).maybeSingle();
 if(!agent?.active) return {to:[] as string[],cc:[] as string[]};
 let email=String(agent.email??"").trim();
 if(!validEmail(email)){const {data}=await db.auth.admin.getUserById(agentId);email=data.user?.email??"";}
 if(!validEmail(email))return {to:[] as string[],cc:[] as string[]};
 const {data:agency}=agent.agency_id?await db.from("agencies").select("legal_email,slug").eq("id",agent.agency_id).maybeSingle():{data:null};
 const cc=validEmail(agency?.legal_email)?String(agency?.legal_email).trim():agency?.slug==="housepro"?houseproFallback:undefined;
 return {to:[email],cc:cc&&validEmail(cc)&&cc.toLowerCase()!==email.toLowerCase()?[cc]:[]};
}
