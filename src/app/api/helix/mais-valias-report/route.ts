import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMaisValiasPdf } from "@/lib/tools/mais-valias-report-pdf";
import { buildMaisValiasHtml } from "@/lib/tools/mais-valias-report-html";
import { buildEmailReport, type MvSubmission } from "@/lib/tools/mais-valias-funnel";
import type { MaisValiasResult } from "@/lib/tools/mais-valias-fiscal";
import { notifyGeneric } from "@/lib/notify";

export const runtime = "nodejs";

async function session() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await client.from("profiles").select("id,agency_id,role_key").eq("id",user.id).single();
  return profile ? { user, profile } : null;
}
async function allowedLead(leadId: string) {
  const auth = await session();
  if (!auth) return { error: NextResponse.json({error:"unauthorized"},{status:401}) };
  const admin = createAdminClient();
  const {data:lead} = await admin.from("leads").select("id,name,email,owner_id,assigned_agent_id,agency_id,sub_source").eq("id",leadId).maybeSingle();
  if (!lead || lead.sub_source !== "Calculadora de mais-valias") return { error: NextResponse.json({error:"not_found"},{status:404}) };
  const sameAgent=lead.owner_id===auth.user.id || lead.assigned_agent_id===auth.user.id;
  const supervisor=["admin","superadmin","broker","manager"].includes(String(auth.profile.role_key).toLowerCase());
  const sameAgency=!!auth.profile.agency_id && auth.profile.agency_id===lead.agency_id;
  if (!sameAgent && !(supervisor && sameAgency)) return {error:NextResponse.json({error:"forbidden"},{status:403})};
  return {admin,lead};
}
const validId=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);

export async function GET(req:Request) {
  const url=new URL(req.url);
  const id=url.searchParams.get("leadId");
  if (!id) {
    const auth=await session();
    if(!auth)return NextResponse.json({error:"unauthorized"},{status:401});
    const admin=createAdminClient();
    const supervisor=["admin","superadmin","broker","manager"].includes(String(auth.profile.role_key).toLowerCase());
    let q=admin.from("leads").select("id,name,email,created_at,email_status,owner_id,assigned_agent_id,agency_id").eq("sub_source","Calculadora de mais-valias").order("created_at",{ascending:false}).limit(100);
    if(supervisor && auth.profile.agency_id)q=q.eq("agency_id",auth.profile.agency_id);
    else q=q.or(`owner_id.eq.${auth.user.id},assigned_agent_id.eq.${auth.user.id}`);
    const {data,error}=await q;
    if(error)return NextResponse.json({error:"query_failed"},{status:500});
    const ids=(data||[]).map(l=>l.id);
    const {data:snapshots}=ids.length?await admin.from("mais_valias_reports").select("lead_id").in("lead_id",ids):{data:[]};
    const available=new Set((snapshots||[]).map(x=>x.lead_id));
    return NextResponse.json({leads:(data||[]).map(l=>({...l,hasReport:available.has(l.id)}))});
  }
  if(!validId(id))return NextResponse.json({error:"invalid_id"},{status:400});
  const access=await allowedLead(id);
  if(access.error)return access.error;
  const {data:snapshot}=await access.admin!.from("mais_valias_reports").select("submission,calculation").eq("lead_id",id).maybeSingle();
  if(!snapshot)return NextResponse.json({error:"legacy_report_unavailable",message:"A simulação anterior não contém os dados necessários para regenerar o PDF."},{status:404});
  const bytes=generateMaisValiasPdf(snapshot.submission as MvSubmission,snapshot.calculation as MaisValiasResult);
  return new Response(new Uint8Array(bytes),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename="HousePro-Mais-Valias-${id}.pdf"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}
export async function POST(req:Request) {
  const body=await req.json().catch(()=>null);
  const id=body?.leadId;
  if(typeof id!=="string" || !validId(id))return NextResponse.json({error:"invalid_id"},{status:400});
  const access=await allowedLead(id);
  if(access.error)return access.error;
  const {data:snapshot}=await access.admin!.from("mais_valias_reports").select("submission,calculation").eq("lead_id",id).maybeSingle();
  if(!snapshot)return NextResponse.json({error:"legacy_report_unavailable"},{status:404});
  if(!access.lead!.email)return NextResponse.json({error:"missing_client_email"},{status:422});
  const s=snapshot.submission as MvSubmission;
  const r=snapshot.calculation as MaisValiasResult;
  const report=buildEmailReport(s,r);
  const pdf=generateMaisValiasPdf(s,r);
  const sent=await notifyGeneric({subject:report.subject,text:report.text,html:buildMaisValiasHtml(s,r),to:[access.lead!.email],attachments:[{filename:"HousePro-Mais-Valias.pdf",content:Buffer.from(pdf).toString("base64")}]});
  if(!sent.includes("email"))return NextResponse.json({error:"email_not_sent",message:"O Resend não confirmou o envio. Verifique as configurações."},{status:502});
  await access.admin!.from("mais_valias_reports").update({last_sent_at:new Date().toISOString()}).eq("lead_id",id);
  await access.admin!.from("leads").update({email_status:"enviado"}).eq("id",id);
  return NextResponse.json({ok:true});
}
