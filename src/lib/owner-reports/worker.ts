import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmail } from "@/lib/email-template";
import { buildReportData, reportContext, reportRecipients, validEmail } from "./data";
import { nextReportDate, prepareOwnerMessage, validateSettings } from "./model";

export async function ownerReportWorkerSecret() {
  const {data,error}=await createAdminClient().rpc("owner_report_worker_access");
  if(error || !data?.secret)throw new Error("worker_unavailable");
  return String(data.secret);
}
export function equalSecret(a:string,b:string) {
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
interface MailPayload {
  from: string; to: string[]; bcc?: string[]; reply_to: string;
  subject: string; text: string; html?: string;
  ownerEmail: string; agentEmail: string; managers: string[];
}
export async function runOwnerReports() {
  const db=createAdminClient();
  const token=randomUUID();
  const {data:lock,error:lockError}=await db.rpc("owner_report_worker_access",{p_token:token});
  if(lockError || !lock?.claimed)return {status:"busy"};
  let queued=0,accepted=0,errors=0;
  try {
    const delivery=await emailDeliveryCredentials();
    if(!delivery.enabled || !delivery.apiKey || !delivery.sender)return {status:"disabled"};
    const now=new Date();
    const {data:due,error}=await db.from("owner_report_settings").select("*").eq("settings->>enabled","true").lte("next_at",now.toISOString()).order("next_at").limit(10);
    if(error)throw new Error("queue_read_failed");
    for(const row of due??[]) {
      try {
        const settings=validateSettings(row.settings);
        if(!settings.enabled)continue;
        const context=await buildReportData(row.property_id,row.period_from,now.toISOString(),settings.sections);
        const {property,agent,data}=context;
        if(property.agent_id!==row.agent_id || !validEmail(property.owner_email) || !validEmail(agent.email))continue;
        if(["vendido","arrendado"].includes(property.status??""))continue;
        const recipients=await reportRecipients(agent.id,agent.agency_id);
        const payload:MailPayload={
          ...prepareOwnerMessage(data,settings,row.sequence,delivery.sender,property.owner_email,recipients.bcc),
          ownerEmail:property.owner_email,agentEmail:agent.email,managers:recipients.bcc,
        };
        const summary=[`Imóvel: ${property.reference} · ${property.title}`,`Consultor: ${agent.name}`,`Período: ${data.from} a ${data.until}`,
          ...data.blocks.filter(b=>settings.sections.includes(b.key)).map(b=>`${b.title}\n${b.lines.join("\n")}`),
          "Resumo interno da atividade comunicada ao proprietário."].join("\n\n");
        const broker:MailPayload|null=recipients.broker && recipients.broker.toLowerCase()!==property.owner_email.toLowerCase()?{
          from:payload.from,to:[recipients.broker],reply_to:agent.email,subject:`Atividade comunicada · ${property.reference}`,
          text:summary,html:houseproEmail(`Atividade · ${property.reference}`,summary),
          ownerEmail:property.owner_email,agentEmail:agent.email,managers:recipients.bcc,
        }:null;
        const {data:saved,error:queueError}=await db.rpc("queue_owner_report",{
          p_property:row.property_id,p_revision:row.revision,p_due:row.next_at,p_until:now.toISOString(),
          p_next:nextReportDate(settings.frequency,settings.day,now).toISOString(),p_owner:payload,p_broker:broker,
        });
        if(queueError)throw new Error("queue_write_failed");
        if(saved)queued++;
      }catch{errors++;}
    }
    const {data:jobs,error:jobsError}=await db.from("owner_report_outbox").select("*").eq("state","pending")
      .or(`last_attempt_at.is.null,last_attempt_at.lt.${new Date(Date.now()-600000).toISOString()}`)
      .order("created_at").limit(10);
    if(jobsError)throw new Error("outbox_read_failed");
    for(const job of jobs??[]) {
      try {
        const {property,agent}=await reportContext(job.property_id);
        const {data:setting,error:settingError}=await db.from("owner_report_settings").select("revision,settings").eq("property_id",job.property_id).maybeSingle();
        if(settingError)throw new Error("settings_read_failed");
        const payload=job.payload as MailPayload;
        const current=await reportRecipients(agent.id,agent.agency_id);
        const managerList=[...current.bcc].sort().join("|");
        const cancelled=!setting?.settings.enabled || setting.revision!==job.revision ||
          property.agent_id!==job.agent_id || property.owner_email!==payload.ownerEmail ||
          agent.email!==payload.agentEmail || managerList!==[...payload.managers].sort().join("|") ||
          (job.kind==="broker" && payload.to[0]!==current.broker) ||
          ["vendido","arrendado"].includes(property.status??"");
        if(cancelled) {
          await db.from("owner_report_outbox").update({state:"cancelled"}).eq("id",job.id);
          continue;
        }
        if(job.kind==="broker"){
          const {data:ownerJob}=await db.from("owner_report_outbox").select("state").eq("property_id",job.property_id).eq("period_end",job.period_end).eq("kind","owner").maybeSingle();
          if(ownerJob?.state!=="accepted")continue;
        }
        if(job.attempts>=5 || (job.first_attempt_at && Date.now()-Date.parse(job.first_attempt_at)>23*3600000)){
          await db.from("owner_report_outbox").update({state:"failed",error_code:"review_required"}).eq("id",job.id);
          continue;
        }
        const attemptAt=new Date().toISOString();
        const {error:attemptError}=await db.from("owner_report_outbox").update({
          attempts:job.attempts+1,first_attempt_at:job.first_attempt_at??attemptAt,last_attempt_at:attemptAt,
        }).eq("id",job.id);
        if(attemptError)continue;
        const {ownerEmail:_,agentEmail:__,managers:___,...mail}=payload;
        void _;void __;void ___;
        try {
          const response=await fetch("https://api.resend.com/emails",{
            method:"POST",headers:{authorization:`Bearer ${delivery.apiKey}`,"content-type":"application/json","Idempotency-Key":`housepro-owner-report/${job.id}`},
            body:JSON.stringify(mail),signal:AbortSignal.timeout(8000),
          });
          const result=await response.json().catch(()=>({}));
          if(response.ok && typeof result.id==="string"){
            const {error:acceptedError}=await db.from("owner_report_outbox").update({state:"accepted",accepted_at:attemptAt,provider_id:result.id,error_code:null}).eq("id",job.id);
            if(!acceptedError)accepted++;
          }else{
            await db.from("owner_report_outbox").update({
              error_code:`resend_${response.status}`,
              ...(response.status>=400 && response.status<500 && response.status!==429?{state:"failed"}:{}),
            }).eq("id",job.id);
          }
        }catch{await db.from("owner_report_outbox").update({error_code:"connection_pending"}).eq("id",job.id);}
      }catch{errors++;}
    }
    return {status:"ok",queued,accepted,errors};
  }finally{
    await db.rpc("owner_report_worker_access",{p_token:token,p_release:true});
  }
}
