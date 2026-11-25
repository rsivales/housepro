import { createHash,randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmail } from "@/lib/email-template";

export const dynamic="force-dynamic";
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
export async function POST(request:Request){
  if(!hasServiceRole())return NextResponse.json({error:"Serviço indisponível."},{status:503});
  const body=await request.json().catch(()=>null);
  const email=String(body?.email??"").trim().toLowerCase();
  const name=String(body?.name??"").trim();
  const offers=body?.offers===true,news=body?.news===true;
  const agencyId=typeof body?.agencyId==="string"&&/^[a-f0-9-]{36}$/i.test(body.agencyId)?body.agencyId:null;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>254||name.length>120||(!offers&&!news)||body?.consent!==true){
    return NextResponse.json({error:"Confirme o email, o consentimento e os conteúdos pretendidos."},{status:422});
  }
  const db=createAdminClient();
  if(agencyId){const {data:agency,error:agencyError}=await db.from("agencies").select("id").eq("id",agencyId).eq("suspended",false).maybeSingle();if(agencyError||!agency)return NextResponse.json({error:"Agência indisponível."},{status:422});}
  const {data:existing,error:lookupError}=await db.from("marketing_subscriptions").select("requested_at").eq("email",email).maybeSingle();
  if(lookupError)return NextResponse.json({error:"Serviço indisponível."},{status:503});
  if(existing?.requested_at&&Date.now()-Date.parse(existing.requested_at)<15*60000)return NextResponse.json({ok:true});
  const delivery=await emailDeliveryCredentials();
  if(!delivery.enabled||!delivery.sender||!delivery.apiKey)return NextResponse.json({error:"Confirmação temporariamente indisponível."},{status:503});
  const token=randomBytes(32).toString("hex");
  const now=new Date().toISOString();
  const {error:writeError}=await db.from("marketing_subscriptions").upsert({
    email,pending_name:name,pending_offers:offers,pending_news:news,pending_agency_id:agencyId,pending_token_hash:hash(token),
    requested_at:now,source:agencyId?"agencia":"website",
  },{onConflict:"email"});
  if(writeError)return NextResponse.json({error:"Não foi possível registar o pedido."},{status:503});
  const path=`/subscrever/confirmar?token=${token}`;
  try{
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{authorization:`Bearer ${delivery.apiKey}`,"content-type":"application/json","Idempotency-Key":`housepro-optin/${hash(token)}`},
      body:JSON.stringify({from:delivery.sender,to:[email],subject:"Confirme a sua subscrição HousePro",
        text:`Recebemos o seu pedido para receber ${[offers&&"imóveis",news&&"novidades"].filter(Boolean).join(" e ")} da HousePro. Confirme a sua escolha em https://housepro.pt${path}\n\nSe não fez este pedido, ignore esta mensagem. O link expira em 48 horas.`,
        html:houseproEmail("Confirme a sua subscrição",`Recebemos o seu pedido para receber ${[offers&&"imóveis",news&&"novidades"].filter(Boolean).join(" e ")} da HousePro. Confirme a sua escolha através do botão abaixo. Se não fez este pedido, ignore esta mensagem. O link expira em 48 horas.`,{label:"Confirmar subscrição",path}),
      }),signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)throw new Error("delivery_failed");
  }catch{
    await db.from("marketing_subscriptions").update({pending_token_hash:null,requested_at:null}).eq("email",email).eq("pending_token_hash",hash(token));
    return NextResponse.json({error:"Não foi possível enviar a confirmação. Tente novamente."},{status:503});
  }
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
