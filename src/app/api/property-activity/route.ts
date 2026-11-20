import { createHash,randomUUID } from "node:crypto";
import { after,NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";
import { mayEditProperty,UUID } from "@/lib/portfolio/server";
import { crmLeadPipelines } from "@/lib/db/crm-lead-pipelines";
import { validateActivity } from "@/lib/property-activity/model";
import { runMatching } from "@/lib/matching/server";

export const dynamic="force-dynamic";
export const maxDuration=120;
async function access(id:string) {
  const s=await getSession();
  return s&&!s.demo&&!s.viewingAs&&hasServiceRole()&&UUID.test(id)&&await mayEditProperty(s.agent,id)?s:null;
}
export async function GET(request:Request) {
  const id=new URL(request.url).searchParams.get("propertyId")??"";
  const s=await access(id);
  if(!s)return NextResponse.json({error:"Sem acesso ao histórico deste imóvel."},{status:403});
  const db=createAdminClient();
  const [history,property,agents,pipelines]=await Promise.all([
    db.from("property_activity_intakes").select("id,kind,occurred_at,source,origin_detail,sentiment,rating,data,listing_agent:profiles!listing_agent_id(name),buyer_agent:profiles!buyer_agent_id(name),document_name,contact_id,lead_id,visit_id,deal_id,confirmed_at").eq("property_id",id).order("occurred_at",{ascending:false}).limit(200),
    db.from("properties").select("reference,title,agent_id").eq("id",id).single(),
    db.from("profiles").select("id,name,agency").eq("agency_id",s.agent.agencyId).eq("active",true).order("name"),
    crmLeadPipelines(s.agent,false),
  ]);
  if(history.error||property.error||agents.error)return NextResponse.json({error:"Não foi possível carregar as fichas e documentos."},{status:503});
  return NextResponse.json({history:history.data,property:property.data,agents:agents.data,pipelines},{headers:{"Cache-Control":"private, no-store"}});
}
const detectedMime=(bytes:Uint8Array)=>{
  if(Buffer.from(bytes.slice(0,5)).toString()==="%PDF-")return "application/pdf";
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if(Buffer.from(bytes.slice(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "image/png";
  if(Buffer.from(bytes.slice(0,4)).toString()==="RIFF"&&Buffer.from(bytes.slice(8,12)).toString()==="WEBP")return "image/webp";
  return null;
};
export async function POST(request:Request) {
  const length=Number(request.headers.get("content-length")??0);
  if(length>4500000)return NextResponse.json({error:"Use um documento até 4 MB."},{status:413});
  const form=await request.formData().catch(()=>null);
  const propertyId=String(form?.get("propertyId")??"");
  const s=await access(propertyId);
  if(!s)return NextResponse.json({error:"Sem acesso à ficha deste imóvel."},{status:403});
  const file=form?.get("document");
  if(!(file instanceof File)||file.size===0||file.size>4*1024*1024)return NextResponse.json({error:"Carregue o original em PDF, JPG, PNG ou WebP, até 4 MB."},{status:422});
  let data;
  try{data=validateActivity(JSON.parse(String(form?.get("data")??"null")));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Reveja os dados da ficha."},{status:422});}
  const pipelines=await crmLeadPipelines(s.agent,false);
  const pipeline=pipelines.find(p=>p.key===data.pipeline);
  if(!pipeline||data.stage>=pipeline.stages.length)return NextResponse.json({error:"O pipeline ou etapa mudou. Atualize a página."},{status:409});
  const bytes=new Uint8Array(await file.arrayBuffer());
  const mime=detectedMime(bytes);
  if(!mime||mime!==file.type)return NextResponse.json({error:"O formato do documento não corresponde ao ficheiro."},{status:422});
  const hash=createHash("sha256").update(bytes).digest("hex");
  const extension={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[mime];
  const path=`${propertyId}/${randomUUID()}.${extension}`;
  const db=createAdminClient();
  const {error:uploadError}=await db.storage.from("property-activity-private").upload(path,bytes,{contentType:mime,upsert:false});
  if(uploadError)return NextResponse.json({error:"Não foi possível guardar o documento original."},{status:503});
  const {data:saved,error}=await db.rpc("save_property_activity",{
    p_actor:s.agent.id,p_property:propertyId,p_data:data,p_path:path,p_name:file.name.slice(0,240),p_mime:mime,p_hash:hash,
  });
  if(error||!saved){
    // SQL errors roll back the entire CRM write. A transport error is ambiguous, so retain the private copy.
    if(error?.code&&/^[0-9A-Z]{5}$/.test(error.code))await db.storage.from("property-activity-private").remove([path]);
    const message=error?.message??"";
    const safe=message.includes("document_already_recorded")?"Este documento já foi registado com outros dados. Consulte o histórico do imóvel.":
      /Este contacto|Telefone e email/.test(message)?message:
      message.includes("invalid_agent")?"Um dos agentes deixou de estar disponível. Atualize a seleção.":
      "Não foi possível gravar a ficha completa. Pode repetir a operação com o mesmo documento.";
    return NextResponse.json({error:safe},{status:409});
  }
  if(saved.exists)await db.storage.from("property-activity-private").remove([path]);
  after(async()=>{await runMatching({contactId:saved.contactId});});
  return NextResponse.json({ok:true,...saved});
}
