import "server-only";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmail } from "@/lib/email-template";
import { matchBuyer, missingQualification, type MatchProperty } from "./engine";
import { qualificationRef, validateBuyerProfile } from "./profile";
type Row = Record<string, unknown>;
export type MatchScope = { contactId?: string; propertyId?: string };
export function tokensEqual(a: string, b: string) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export async function workerConfig() { const {data,error}=await createAdminClient().rpc("match_worker_access"); if(error)throw new Error("matching_configuration"); return data as {secret:string;enabled:boolean}; }
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function allRows(query: (from: number, to: number) => PromiseLike<{data: Row[] | null;error: unknown}>) {
 const result: Row[]=[];
 for(let start=0;start<50000;start+=500) { const {data,error}=await query(start,start+499); if(error)throw new Error("matching_read_failed"); result.push(...(data??[])); if(!data || data.length<500)return result; }
 throw new Error("matching_capacity");
}
/** Global lock protects durable outbox retries across saves and hourly cron. No PII in summaries. */
export async function runMatching(scope: MatchScope = {}) {
 if(!hasServiceRole())return {status:"unavailable"};
 const db=createAdminClient(),token=randomUUID();
 const {data:lock,error:lockError}=await db.rpc("match_worker_access",{p_token:token});
 if(lockError || !lock?.claimed)return {status:"busy"};
 let failure: string | null=null;
 try {
  const [contacts,properties,agents,deals]=await Promise.all([
   allRows((f,t)=>{let q=db.from("contacts").select("id,type,owner_id,buyer_profile").in("type",["comprador","investidor"]).order("id").range(f,t);if(scope.contactId)q=q.eq("id",scope.contactId);return q;}),
   allRows((f,t)=>{let q=db.from("properties").select("id,reference,title,price,typology,parish,municipality,status,operation,approval,listing_state,off_market,agent_id,accepts_exchange").order("id").range(f,t);if(scope.propertyId)q=q.eq("id",scope.propertyId);return q;}),
   allRows((f,t)=>db.from("profiles").select("id,name,email,active").eq("active",true).order("id").range(f,t)),
   allRows((f,t)=>db.from("deals").select("id,property_id,stage").in("stage",["proposta_enviada","proposta_aceite","reserva","cpcv","escritura","concluido"]).order("id").range(f,t)),
  ]);
  const agentMap=new Map(agents.map(a=>[String(a.id),a]));
  const unavailable=new Set(deals.filter(d=>["cpcv","escritura","concluido"].includes(String(d.stage))).map(d=>d.property_id));
  const proposals=new Set(deals.filter(d=>["proposta_enviada","proposta_aceite"].includes(String(d.stage))).map(d=>d.property_id));
  const reserved=new Set(deals.filter(d=>d.stage==="reserva").map(d=>d.property_id));
  // Includes contacts whose type/owner changed: invalidate scoped existing rows as well.
  let invalidation=db.from("buyer_matches").update({active:false}).eq("active",true);
  if(scope.contactId)invalidation=invalidation.eq("contact_id",scope.contactId);
  if(scope.propertyId)invalidation=invalidation.eq("property_id",scope.propertyId);
  const {error:invalidateError}=await invalidation; if(invalidateError)throw new Error("matching_invalidation_failed");
  let matches=0;
  for(const c of contacts) {
   const buyer=agentMap.get(String(c.owner_id)); if(!buyer)continue;
   let profile;try{profile=validateBuyerProfile(c.buyer_profile??{});}catch{continue;}
   for(const row of properties) {
    if(unavailable.has(row.id))continue;
    const seller=agentMap.get(String(row.agent_id));if(!seller)continue;
    const property={...row,price:Number(row.price),status:reserved.has(row.id)?"reservado":row.status,proposal:proposals.has(row.id)} as MatchProperty;
    const result=matchBuyer(profile,property);if(!result)continue;
    const ref=qualificationRef(String(c.id));
    const summary={...result,propertyRef:property.reference,propertyTitle:property.title,price:property.price,typology:property.typology,zone:`${property.parish}, ${property.municipality}`,acceptsExchange:property.accepts_exchange,buyerAgentName:buyer.name,propertyAgentName:seller.name,buyerAgentEmail:buyer.email,propertyAgentEmail:seller.email,budgetMax:profile.budgetMax,urgency:profile.urgency};
    const revision=hash({summary,buyerId:buyer.id,sellerId:seller.id,matchEmails:profile.matchEmails!==false});
    const {data:saved,error}=await db.from("buyer_matches").upsert({contact_id:c.id,property_id:row.id,buyer_agent_id:buyer.id,property_agent_id:seller.id,qualification_ref:ref,score:result.score,exact:result.exact,summary,revision,active:true,updated_at:new Date().toISOString()},{onConflict:"contact_id,property_id"}).select("id").single();
    if(error || !saved)throw new Error("matching_write_failed");matches++;
    if(profile.matchEmails===false)continue;
    for(const recipient of new Map([[buyer.id,buyer],[seller.id,seller]]).values()) {
     const ownBuyer=recipient.id===buyer.id;
     const eligible=(recipient.id===buyer.id && result.buyerEligible)||(recipient.id===seller.id && result.propertyEligible);
     if(!recipient.email || !eligible)continue;
     const subject=ownBuyer?`Sugestão de imóvel · ${property.reference}`:`Comprador compatível · ${property.reference}`;
     const text=[`Qualificação: ${ref}`,`Consultor do comprador: ${buyer.name}${buyer.email?` · ${buyer.email}`:""}`,`Imóvel: ${property.reference} · ${property.title}`,`ID: ${property.id}`,`Angariador: ${seller.name}${seller.email?` · ${seller.email}`:""}`,`${property.typology} · ${summary.zone} · ${new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(property.price)}`,`Estado: ${result.status}`,`Compatibilidade: ${result.score}% · ${result.exact?"Correspondência próxima":"Alternativa flexível"}`,...result.reasons,...result.warnings,`Ver imóvel: https://housepro.pt/imovel/${property.id}`,`Ver correspondências: https://housepro.pt/app/matches`,"Contacte o consultor responsável antes de apresentar uma proposta. O orçamento máximo do comprador não foi alterado. Configure os alertas na qualificação do contacto."].join("\n\n");
     const {error:queueError}=await db.from("match_email_outbox").upsert({match_id:saved.id,recipient_id:recipient.id,revision,payload:{to:recipient.email,subject,text}},{onConflict:"match_id,recipient_id,revision",ignoreDuplicates:true});if(queueError)throw new Error("matching_queue_failed");
    }
   }
  }
  const delivery=await deliverMatches(db);
  return {status:"ok",matches,...delivery};
 }catch(error) { const code=error instanceof Error?error.message:"";failure=/^matching_[a-z_]+$/.test(code)?code:"matching_failed";console.error("[matching] execution failed",failure);return {status:"error"}; }
 finally {await db.rpc("match_worker_access",{p_token:token,p_release:true,p_error:failure});}
}
export async function deliverMatches(db: ReturnType<typeof createAdminClient>) {
 const worker=await workerConfig();
 if(!worker.enabled)return {accepted:0,pending:true};
 const config=await emailDeliveryCredentials();if(!config.enabled || !config.apiKey || !config.sender)return {accepted:0,pending:true};
 const retryBefore=new Date(Date.now()-10*60*1000).toISOString();
 const {data:jobs,error}=await db.from("match_email_outbox").select("*").eq("state","pending").or(`last_attempt_at.is.null,last_attempt_at.lt.${retryBefore}`).order("created_at").limit(8);
 if(error)throw new Error("matching_queue_read");let accepted=0;
 for(const job of jobs??[]) {
  const {data:m}=await db.from("buyer_matches").select("active,revision,contact_id,property_id,buyer_agent_id,property_agent_id").eq("id",job.match_id).single();
  const [{data:c},{data:p},{data:recipient}]=await Promise.all([
   db.from("contacts").select("owner_id,type,buyer_profile").eq("id",m?.contact_id??"00000000-0000-0000-0000-000000000000").maybeSingle(),
   db.from("properties").select("agent_id,approval,listing_state,off_market,status").eq("id",m?.property_id??"00000000-0000-0000-0000-000000000000").maybeSingle(),
   db.from("profiles").select("active,email").eq("id",job.recipient_id).maybeSingle(),
  ]);
  const recipientEligible = Boolean(m && ((job.recipient_id===m.buyer_agent_id && missingQualification(c?.buyer_profile??{},"buyer").length===0) || (job.recipient_id===m.property_agent_id && missingQualification(c?.buyer_profile??{},"property").length===0)));
  if(!m?.active || m.revision!==job.revision || c?.owner_id!==m.buyer_agent_id || p?.agent_id!==m.property_agent_id || !recipient?.active || recipient.email!==job.payload.to || !["comprador","investidor"].includes(c?.type??"") || !recipientEligible || c?.buyer_profile?.active===false || c?.buyer_profile?.matchEmails===false || !p || p.approval!=="aprovado" || p.listing_state!=="activo" || p.off_market || ["vendido","arrendado","cpcv"].includes(p.status??"")) {await db.from("match_email_outbox").update({state:"cancelled"}).eq("id",job.id);continue;}
  // Resend keeps keys 24h. After an ambiguous response, never retry beyond this window.
  if(job.attempts>=5 || (job.first_attempt_at && Date.now()-Date.parse(job.first_attempt_at)>23*3600000)) {await db.from("match_email_outbox").update({state:"failed",error_code:"review_required"}).eq("id",job.id);continue;}
  const now=new Date().toISOString();
  const {error:attemptError}=await db.from("match_email_outbox").update({attempts:job.attempts+1,first_attempt_at:job.first_attempt_at??now,last_attempt_at:now}).eq("id",job.id);if(attemptError)continue;
  try {
   const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${config.apiKey}`,"content-type":"application/json","Idempotency-Key":`housepro-match/${job.id}`},body:JSON.stringify({from:config.sender,to:[job.payload.to],...(config.notifyEmail?{reply_to:config.notifyEmail}:{}),subject:job.payload.subject,text:job.payload.text,html:houseproEmail(job.payload.subject,job.payload.text,{label:"Ver correspondências no Helix",path:"/app/matches"})}),signal:AbortSignal.timeout(8000)});
   const data=await r.json().catch(()=>({}));
   if(r.ok && typeof data.id==="string") { const {error:saveError}=await db.from("match_email_outbox").update({state:"accepted",accepted_at:now,provider_id:data.id,error_code:null}).eq("id",job.id);if(!saveError)accepted++; }
   else {await db.from("match_email_outbox").update({error_code:`resend_${r.status}`,...(r.status>=400&&r.status<500&&r.status!==429?{state:"failed"}:{})}).eq("id",job.id);}
  }catch {await db.from("match_email_outbox").update({error_code:"connection_pending"}).eq("id",job.id);}
 }
 return {accepted};
}
