import {createAdminClient} from "@/lib/supabase/admin";
import {resolvePageToken} from "@/lib/meta/secrets";
import {pipelineForCampaignType,type CampaignType} from "@/lib/data/meta";

export type MetaReceipt={leadgen_id:string;page_id:string;form_id:string;status:"pending"|"processed";attempts:number;lead_id:string|null};
export type MetaLeadFields={id:string;form_id?:string;created_time?:string;field_data?:{name:string;values:string[]}[]};
const idPattern=/^[0-9]{1,40}$/;
const graphVersion=/^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION||"")?process.env.META_GRAPH_VERSION:"v26.0";

export function validMetaId(id:unknown):id is string{return typeof id==="string"&&idPattern.test(id)}
export function extractLeadEvents(body:unknown){if(!body||typeof body!=="object"||!("object" in body)||(body as {object?:unknown}).object!=="page")return [];const entries=(body as {entry?:unknown}).entry;if(!Array.isArray(entries))return [];const events:{leadgen_id:string;form_id:string;page_id:string}[]=[];for(const entry of entries){if(!entry||typeof entry!=="object")continue;for(const change of Array.isArray(entry.changes)?entry.changes:[]){if(change?.field!=="leadgen")continue;const v=change.value;if(validMetaId(String(v?.leadgen_id??""))&&validMetaId(String(v?.form_id??""))&&validMetaId(String(v?.page_id??entry.id??"")))events.push({leadgen_id:String(v.leadgen_id),form_id:String(v.form_id),page_id:String(v.page_id??entry.id)});}}return events}

async function graphGet<T>(path:string,token:string):Promise<T>{const url=new URL(`https://graph.facebook.com/${graphVersion}/${path}`);const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000),cache:"no-store"});if(!res.ok)throw Error(`graph_http_${res.status}`);return await res.json() as T}

export async function listMetaPageForms(pageId:string,token:string){if(!validMetaId(pageId))throw Error("invalid_page_id");const result=await graphGet<{data:{id:string;name:string;status?:string}[]}>(`${pageId}/leadgen_forms?fields=id,name,status&limit=100`,token);return (result.data??[]).filter(f=>validMetaId(f.id))}
export async function verifyMetaPage(pageId:string,token:string){if(!validMetaId(pageId))throw Error("invalid_page_id");const page=await graphGet<{id:string;name:string}>(`${pageId}?fields=id,name`,token);if(page.id!==pageId)throw Error("page_token_mismatch");return page}

export async function queueMetaReceipt(event:{leadgen_id:string;form_id:string;page_id:string}){const db=createAdminClient();const {error}=await db.from("meta_lead_receipts").upsert(event,{onConflict:"leadgen_id",ignoreDuplicates:true});if(error)throw Error("receipt_persist_failed")}

/** No PII is logged; failures remain safely queued for an authorised retry. */
export async function processMetaReceipt(leadgenId:string):Promise<{status:"processed"|"pending";reason?:string}>{const db=createAdminClient();const {data:receipt,error:readError}=await db.from("meta_lead_receipts").select("*").eq("leadgen_id",leadgenId).single();if(readError||!receipt)throw Error("receipt_not_found");if(receipt.status==="processed")return {status:"processed"};
 const pending=async(reason:string)=>{await db.from("meta_lead_receipts").update({last_error:reason,attempts:(receipt.attempts||0)+1}).eq("leadgen_id",leadgenId);return {status:"pending" as const,reason}};
 const {data:connection}=await db.from("meta_connections").select("page_id,token_ref,status,agency_id").eq("page_id",receipt.page_id).eq("status","ligada").maybeSingle();
 const token=resolvePageToken(connection?.token_ref??undefined);
 if(!token||(!connection&&receipt.page_id!=="0"))return pending("connection_or_token_missing");
 let graph:MetaLeadFields;try{graph=await graphGet<MetaLeadFields>(`${leadgenId}?fields=id,form_id,created_time,field_data`,token)}catch{return pending("graph_fetch_failed")}
 if(String(graph.id)!==leadgenId||String(graph.form_id||receipt.form_id)!==receipt.form_id)return pending("graph_form_mismatch");
 const {data:form}=await db.from("lead_forms").select("id,name,campaign_id").eq("meta_form_id",receipt.form_id).maybeSingle();
 if(!form?.campaign_id)return pending("form_or_campaign_not_mapped");
 const {data:campaign}=form?.campaign_id?await db.from("campaigns").select("id,name,type,owner_type,owner_id,responsible_id,created_by").eq("id",form.campaign_id).maybeSingle():{data:null};
 if(!campaign)return pending("campaign_not_found");
 const {data:mappings}=form?await db.from("field_mappings").select("question_key,lead_field").eq("form_id",form.id):{data:[]};
 const map=new Map((mappings??[]).map(m=>[m.question_key.toLowerCase(),m.lead_field]));
 const answers=(graph.field_data??[]).slice(0,60).map(f=>({question_key:String(f.name||"").slice(0,120),value:String(f.values?.[0]||"").slice(0,2000)})).filter(f=>f.question_key);
 const pick=(field:string,aliases:string[])=>answers.find(f=>map.get(f.question_key.toLowerCase())===field)?.value||answers.find(f=>aliases.includes(f.question_key.toLowerCase()))?.value||"";
 const name=pick("name",["full_name","nome","name","first_name"]).slice(0,160)||"Contacto da Meta";
 const phone=pick("contact",["phone_number","phone","telefone","telemovel"]).slice(0,60);
 const email=pick("email",["email","email_address"]).slice(0,254);
 if(!phone&&!email)return pending("no_contact_in_form");
 const {data:linked}=campaign?await db.from("campaign_properties").select("property_id,property_ref").eq("campaign_id",campaign.id).limit(1).maybeSingle():{data:null};
 const {data:property}=linked?await db.from("properties").select("agent_id,reference").eq("id",linked.property_id).maybeSingle():{data:null};
 const {data:rule}=campaign?await db.from("assignment_rules").select("strategy,agent_id,active").eq("campaign_id",campaign.id).eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle():{data:null};
 // Default to the campaign's author, then apply an explicit consultant or property rule.
 const origin=campaign?.owner_type==="AGENT"?campaign.owner_id:campaign?.responsible_id??campaign?.created_by;
 const candidate=rule?.strategy==="specific"?rule.agent_id:rule?.strategy==="property"?property?.agent_id:campaign?.responsible_id??origin;
 const {data:agent}=candidate?await db.from("profiles").select("id,agency_id,active").eq("id",candidate).maybeSingle():{data:null};
 const assignee=agent?.active?agent:null;
 const {data:existing}=await db.from("leads").select("id,campaign_id,assigned_agent_id").eq("external_id",leadgenId).maybeSingle();
 const payload={name,contact:phone||email,email:email||null,source:"facebook",sub_source:campaign?`Meta · ${campaign.name}`:`Meta · formulário ${receipt.form_id}`,message:pick("message",["message","mensagem"]).slice(0,2000)||null,property_id:linked?.property_id??null,property_ref:linked?.property_ref??property?.reference??null,owner_id:assignee?.id??null,assigned_agent_id:assignee?.id??null,commercial_origin_id:validUuid(origin)?origin:null,agency_id:assignee?.agency_id??connection?.agency_id??null,campaign_id:campaign?.id??null,form_id:form?.id??null,pipeline:campaign?pipelineForCampaignType(campaign.type as CampaignType):null,unassigned:!assignee,qualification:"novo",consent:{source:"Meta Lead Ads",formId:receipt.form_id,createdAt:graph.created_time||null},external_id:leadgenId};
 let leadId=existing?.id as string|undefined;
 if(!leadId){const {data:inserted,error}=await db.from("leads").insert({...payload,status:"novo",intent:"mensagem"}).select("id").single();if(error){if(error.code!=="23505")return pending("lead_insert_failed");const {data:dup}=await db.from("leads").select("id").eq("external_id",leadgenId).maybeSingle();leadId=dup?.id}else leadId=inserted.id}
 if(!leadId)return pending("lead_dedupe_failed");
 if(existing&&!existing.campaign_id&&campaign){const {error}=await db.from("leads").update(payload).eq("id",leadId);if(error)return pending("lead_assign_failed")}
 const {data:hasAnswers}=await db.from("lead_answers").select("id").eq("lead_id",leadId).limit(1);
 if(!hasAnswers?.length&&answers.length){const {error}=await db.from("lead_answers").insert(answers.map(a=>({lead_id:leadId,question_key:a.question_key,label:a.question_key,value:a.value,pii:["full_name","phone_number","email","nome","telefone"].includes(a.question_key.toLowerCase())})));if(error)return pending("answers_insert_failed")}
 if(!existing){
  await db.from("lead_activities").insert({lead_id:leadId,type:"created",note:`Lead da campanha ${campaign.name} recebida via Meta.`});
  if(assignee){await db.from("notifications").insert({user_id:assignee.id,type:"meta_lead",title:"Nova lead da campanha Meta",body:campaign.name,href:"/app/meta/pipeline"});
   if(assignee.agency_id){const {data:broker}=await db.from("profiles").select("id").eq("agency_id",assignee.agency_id).in("role_key",["diretor","admin"]).eq("active",true).neq("id",assignee.id).limit(1).maybeSingle();if(broker)await db.from("notifications").insert({user_id:broker.id,type:"meta_lead",title:"Lead Meta atribuída a consultor",body:campaign.name,href:"/app/meta/relatorios"})}
  }
 }
 const {error:doneError}=await db.from("meta_lead_receipts").update({status:"processed",lead_id:leadId,processed_at:new Date().toISOString(),last_error:!campaign?"form_not_mapped":null,attempts:(receipt.attempts||0)+1}).eq("leadgen_id",leadgenId);if(doneError)return pending("receipt_update_failed");return {status:"processed"};}

function validUuid(v:unknown):v is string{return typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)}

export async function backfillMetaForm(formId:string){if(!validMetaId(formId))throw Error("invalid_form_id");const db=createAdminClient();const {data:form}=await db.from("lead_forms").select("id").eq("meta_form_id",formId).maybeSingle();if(!form)throw Error("form_not_registered");const {data:connection}=await db.from("meta_connections").select("page_id,token_ref").eq("status","ligada").limit(1).maybeSingle();const token=resolvePageToken(connection?.token_ref??undefined);if(!token)throw Error("page_token_missing");let after:string|undefined,queued=0,processed=0;for(let page=0;page<10;page++){const query=new URLSearchParams({fields:"id,form_id,created_time,field_data",limit:"100"});if(after)query.set("after",after);const result=await graphGet<{data:MetaLeadFields[];paging?:{cursors?:{after?:string}}}>(`${formId}/leads?${query}`,token);for(const item of result.data??[]){if(!validMetaId(String(item.id)))continue;await queueMetaReceipt({leadgen_id:String(item.id),form_id:formId,page_id:connection?.page_id??"0"});queued++;const output=await processMetaReceipt(String(item.id));if(output.status==="processed")processed++}const next=result.paging?.cursors?.after;if(!next||next===after||!result.data?.length)break;after=next}return {queued,processed}}
