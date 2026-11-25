import {randomBytes,createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailDeliveryCredentials} from "@/lib/email-delivery";
import {houseproEmail} from "@/lib/email-template";

const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
async function agent(){const session=await getSession();return session&&!session.demo&&!session.viewingAs?session.agent:null;}
export async function POST(request:Request){
  const current=await agent();if(!current)return NextResponse.json({error:"Sessão profissional necessária."},{status:401});
  const body=await request.json().catch(()=>({}));
  const email=String(body.email??"").trim().toLowerCase(),name=String(body.name??"").trim().slice(0,120);
  if(body.send&&(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)))return NextResponse.json({error:"Indique o email do cliente para enviar o convite."},{status:422});
  const token=randomBytes(32).toString("base64url"),url=`https://housepro.pt/recolha-mais-valias/${token}`;
  const {error}=await createAdminClient().from("mv_client_intake").insert({agent_id:current.id,token_hash:hash(token),client_name:name||null,client_email:email||null,expires_at:new Date(Date.now()+7*86400000).toISOString()});
  if(error)return NextResponse.json({error:"Não foi possível criar o pedido."},{status:503});
  let sent=false;
  if(body.send){
    const delivery=await emailDeliveryCredentials();
    if(delivery.enabled&&delivery.apiKey&&delivery.sender){
      const subject="Dados para a simulação de mais-valias · HousePro";
      const text=`Olá ${name||""},\n\nPara preparar uma estimativa de mais-valias mais ajustada ao seu caso, pode indicar os dados fiscais necessários nesta ligação privada, válida durante 7 dias:\n${url}\n\nA utilização é facultativa. Também pode transmitir estes dados ao seu consultor por telefone ou durante uma consulta na agência. A informação será usada apenas para esta análise, conforme a política de privacidade da HousePro. Não pedimos credenciais de acesso ao Portal das Finanças.\n\n${current.name}\nHousePro`;
      try{const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${delivery.apiKey}`,"content-type":"application/json"},body:JSON.stringify({from:delivery.sender,to:[email],reply_to:current.email||delivery.notifyEmail,subject,text,html:houseproEmail(subject,text)}),signal:AbortSignal.timeout(8000)});sent=res.ok;}catch{}
    }
  }
  return NextResponse.json({url,sent,status:body.send?(sent?"enviado":"pendente"):"criado"});
}
export async function GET(){
  const current=await agent();if(!current)return NextResponse.json({error:"Sessão profissional necessária."},{status:401});
  const {data,error}=await createAdminClient().from("mv_client_intake").select("id,client_name,client_email,answers,consent_at,created_at,completed_at,expires_at").eq("agent_id",current.id).order("created_at",{ascending:false}).limit(30);
  return error?NextResponse.json({error:"Falha ao consultar respostas."},{status:503}):NextResponse.json({requests:data??[]},{headers:{"cache-control":"no-store"}});
}
