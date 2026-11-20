import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { UUID } from "@/lib/portfolio/server";
import { buildReportData, reportContext, reportRecipients, validEmail } from "@/lib/owner-reports/data";
import { DEFAULT_REPORT, initialReportStart, nextReportDate, renderOwnerReport, validateSettings } from "@/lib/owner-reports/model";

export const dynamic="force-dynamic";
export const maxDuration=60;
async function session() {
  const s=await getSession();
  return s && !s.demo && !s.viewingAs && hasServiceRole()?s:null;
}
export async function GET() {
  const s=await session();
  if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});
  const db=createAdminClient();
  const {data:properties,error}=await db.from("properties")
    .select("id,reference,title,owner_name,owner_email,status,cover_url")
    .eq("agent_id",s.agent.id).or("status.is.null,status.not.in.(vendido,arrendado)").order("created_at",{ascending:false}).limit(501);
  if(error || (properties?.length??0)>500)return NextResponse.json({error:"Não foi possível carregar os imóveis."},{status:503});
  const ids=(properties??[]).map(p=>p.id);
  const [{data:settings,error:settingsError},{data:history,error:historyError}]=ids.length?await Promise.all([
    db.from("owner_report_settings").select("*").in("property_id",ids),
    db.from("owner_report_outbox").select("id,property_id,kind,state,period_end,accepted_at,error_code").in("property_id",ids).order("created_at",{ascending:false}).limit(100),
  ]):[{data:[],error:null},{data:[],error:null}];
  if(settingsError||historyError)return NextResponse.json({error:"A configuração dos relatórios está indisponível."},{status:503});
  return NextResponse.json({properties:properties??[],settings,history,agentEmail:s.agent.email,agentId:s.agent.id},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request) {
  const s=await session();
  if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});
  const body=await request.json().catch(()=>null);
  if(!body || !UUID.test(String(body.propertyId)))return NextResponse.json({error:"Imóvel inválido."},{status:400});
  try {
    const settings=validateSettings(body.settings);
    const {property,agent}=await reportContext(body.propertyId);
    if(property.agent_id!==s.agent.id)return NextResponse.json({error:"Acesso reservado ao consultor responsável."},{status:403});
    const {data:config,error}=await createAdminClient().from("owner_report_settings").select("*").eq("property_id",body.propertyId).maybeSingle();
    if(error)throw new Error("A configuração dos relatórios está indisponível.");
    const until=new Date().toISOString();
    const from=config?.period_from??initialReportStart(settings,property.created_at,new Date());
    const report=await buildReportData(body.propertyId,from,until,settings.sections);
    const recipients=await reportRecipients(agent.id,agent.agency_id);
    return NextResponse.json({...renderOwnerReport(report.data,settings,config?.sequence??0),data:report.data,to:property.owner_email,replyTo:agent.email,...recipients},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível criar a pré-visualização."},{status:400});}
}
export async function PUT(request:Request) {
  const s=await session();
  if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});
  const body=await request.json().catch(()=>null);
  if(!body || !UUID.test(String(body.propertyId)))return NextResponse.json({error:"Imóvel inválido."},{status:400});
  try {
    const settings=validateSettings(body.settings);
    const {property,agent}=await reportContext(body.propertyId);
    if(property.agent_id!==s.agent.id)return NextResponse.json({error:"Acesso reservado ao consultor responsável."},{status:403});
    if(!validEmail(property.owner_email)||!validEmail(agent.email))throw new Error("Complete o email do proprietário e o email do seu perfil antes de ativar.");
    const db=createAdminClient();
    const {data:previous,error}=await db.from("owner_report_settings").select("revision,agent_id,next_at,settings").eq("property_id",body.propertyId).maybeSingle();
    if(error)throw new Error("A configuração está indisponível.");
    if((!previous || previous.agent_id!==s.agent.id) && !settings.enabled)throw new Error("A primeira configuração deve ativar os relatórios.");
    if((previous?.revision??null)!==(body.revision??null))return NextResponse.json({error:"A configuração mudou. Atualize a página."},{status:409});
    const now=new Date();
    const next=previous && previous.settings.frequency===settings.frequency && previous.settings.day===settings.day && previous.settings.enabled===settings.enabled?
      previous.next_at:nextReportDate(settings.frequency,settings.day,now).toISOString();
    const {data:saved,error:saveError}=await db.rpc("save_owner_report_settings",{
      p_property:property.id,p_agent:agent.id,p_expected:previous?.revision??null,p_settings:settings,
      p_from:initialReportStart(settings,property.created_at,new Date()),p_next:next,
    });
    if(saveError||!saved)throw new Error("Não foi possível guardar. Atualize a página e tente novamente.");
    return NextResponse.json({ok:true,nextAt:next,defaults:DEFAULT_REPORT});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível guardar."},{status:400});}
}
