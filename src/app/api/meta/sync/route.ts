import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient,hasServiceRole} from "@/lib/supabase/admin";
import {resolvePageToken,getAppSecret,getVerifyToken} from "@/lib/meta/secrets";
import {backfillMetaForm,listMetaPageForms,processMetaReceipt,validMetaId,verifyMetaPage} from "@/lib/meta/live-leads";
const allowed=new Set(["coordenador","diretor","admin","superadmin"]);
async function authorised(){const session=await getSession();return session&&!session.demo&&(allowed.has(session.agent.roleKey??"")||session.agent.role==="admin")}
export async function GET(){if(!await authorised())return NextResponse.json({error:"forbidden"},{status:403});if(!hasServiceRole())return NextResponse.json({error:"service_role_missing"},{status:503});
 const db=createAdminClient();const {data:connections}=await db.from("meta_connections").select("id,page_id,page_name,status,connected_at,token_ref").order("created_at",{ascending:false}).limit(10);
 const {data:forms}=await db.from("lead_forms").select("id,meta_form_id,name,campaign_id").order("created_at",{ascending:false}).limit(100);
 const {count:pending}=await db.from("meta_lead_receipts").select("leadgen_id",{count:"exact",head:true}).eq("status","pending");
 const {count:processed}=await db.from("meta_lead_receipts").select("leadgen_id",{count:"exact",head:true}).eq("status","processed");
 const connection=connections?.find(c=>c.status==="ligada");const token=resolvePageToken(connection?.token_ref??undefined);
 let availableForms:{id:string;name:string;status?:string}[]=[],formError:string|undefined;
 if(connection&&token)try{availableForms=await listMetaPageForms(connection.page_id,token)}catch{formError="Não foi possível consultar os formulários. Verifique permissões e token da Página."}
 return NextResponse.json({configured:{appSecret:!!getAppSecret(),verifyToken:!!getVerifyToken(),pageToken:!!token,serviceRole:true},connections:(connections??[]).map(c=>({id:c.id,page_id:c.page_id,page_name:c.page_name,status:c.status,connected_at:c.connected_at})),forms:forms??[],availableForms,pending:pending??0,processed:processed??0,formError,callback:"/api/meta/webhook"});}
export async function POST(request:Request){if(!await authorised())return NextResponse.json({error:"forbidden"},{status:403});if(!hasServiceRole())return NextResponse.json({error:"service_role_missing"},{status:503});let body:{action?:string;formId?:string;campaignId?:string;pageId?:string}={};try{body=await request.json()}catch{return NextResponse.json({error:"invalid_json"},{status:400})}
 const db=createAdminClient();
 if(body.action==="connect"){
  if(!validMetaId(body.pageId))return NextResponse.json({error:"invalid_page_id"},{status:400});
  const token=resolvePageToken();if(!token||!getAppSecret()||!getVerifyToken())return NextResponse.json({error:"Configure META_APP_SECRET, META_VERIFY_TOKEN e META_PAGE_TOKEN no servidor."},{status:409});
  try{const page=await verifyMetaPage(body.pageId,token);const {data:prior}=await db.from("meta_connections").select("id").eq("page_id",body.pageId).limit(1).maybeSingle();const values={page_id:page.id,page_name:page.name,status:"ligada",token_ref:null,connected_at:new Date().toISOString()};const query=prior?db.from("meta_connections").update(values).eq("id",prior.id):db.from("meta_connections").insert(values);const {error}=await query;if(error)throw error;return NextResponse.json({ok:true,pageName:page.name})}catch{return NextResponse.json({error:"Não foi possível validar a Página com o token configurado."},{status:400})}
 }
 if(body.action==="link"){
  if(!validMetaId(body.formId)||!body.campaignId||!/^[0-9a-f-]{36}$/i.test(body.campaignId))return NextResponse.json({error:"invalid_form_or_campaign"},{status:400});
  const {data:campaign}=await db.from("campaigns").select("id").eq("id",body.campaignId).maybeSingle();if(!campaign)return NextResponse.json({error:"campaign_not_found"},{status:404});
  const {data:connection}=await db.from("meta_connections").select("page_id,token_ref").eq("status","ligada").limit(1).maybeSingle();const token=resolvePageToken(connection?.token_ref??undefined);
  if(!connection||!token)return NextResponse.json({error:"connection_missing"},{status:409});
  let name="";try{name=(await listMetaPageForms(connection.page_id,token)).find(f=>f.id===body.formId)?.name??""}catch{return NextResponse.json({error:"graph_forms_unavailable"},{status:502})}
  if(!name)return NextResponse.json({error:"form_not_on_connected_page"},{status:400});
  const {error}=await db.from("lead_forms").upsert({meta_form_id:body.formId,name,campaign_id:body.campaignId},{onConflict:"meta_form_id"});if(error)return NextResponse.json({error:"form_link_failed"},{status:500});
  try{return NextResponse.json({ok:true,...await backfillMetaForm(body.formId)})}catch{return NextResponse.json({ok:true,backfillPending:true})}
 }
 if(body.action==="backfill"){
  if(!validMetaId(body.formId))return NextResponse.json({error:"invalid_form_id"},{status:400});try{return NextResponse.json({ok:true,...await backfillMetaForm(body.formId)})}catch{return NextResponse.json({error:"backfill_failed_or_unavailable"},{status:502})}
 }
 if(body.action==="retry"){
  const {data:receipts,error}=await db.from("meta_lead_receipts").select("leadgen_id").eq("status","pending").order("received_at").limit(50);if(error)return NextResponse.json({error:"receipt_read_failed"},{status:500});let processed=0;
  for(const item of receipts??[])try{if((await processMetaReceipt(item.leadgen_id)).status==="processed")processed++}catch{/* Remains pending. */}
  return NextResponse.json({ok:true,attempted:receipts?.length??0,processed});
 }
 return NextResponse.json({error:"invalid_action"},{status:400});}
