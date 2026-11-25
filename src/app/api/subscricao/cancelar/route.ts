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
  if(body?.action==="confirm"){
    const token=String(body.token??"");
    if(!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:"Link inválido."},{status:422});
    const db=createAdminClient();
    const {data:row}=await db.from("marketing_subscriptions").select("email,cancel_requested_at").eq("cancel_token_hash",hash(token)).maybeSingle();
    if(!row?.cancel_requested_at||Date.now()-Date.parse(row.cancel_requested_at)>48*3600000)return NextResponse.json({error:"Link expirado."},{status:422});
    const {error}=await db.from("marketing_subscriptions").update({unsubscribed_at:new Date().toISOString(),cancel_token_hash:null,cancel_requested_at:null})
      .eq("email",row.email).eq("cancel_token_hash",hash(token));
    return NextResponse.json(error?{error:"Não foi possível cancelar."}:{ok:true},{status:error?503:200});
  }
  const email=String(body?.email??"").trim().toLowerCase();
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>254)return NextResponse.json({error:"Email inválido."},{status:422});
  const db=createAdminClient();
  const {data:row}=await db.from("marketing_subscriptions").select("email,cancel_requested_at,confirmed_at,unsubscribed_at").eq("email",email).maybeSingle();
  if(!row?.confirmed_at||row.unsubscribed_at||row.cancel_requested_at&&Date.now()-Date.parse(row.cancel_requested_at)<15*60000)return NextResponse.json({ok:true});
  const delivery=await emailDeliveryCredentials();
  if(!delivery.enabled||!delivery.sender||!delivery.apiKey)return NextResponse.json({error:"Serviço temporariamente indisponível."},{status:503});
  const token=randomBytes(32).toString("hex"),path=`/subscrever/cancelar?token=${token}`;
  const {error}=await db.from("marketing_subscriptions").update({cancel_token_hash:hash(token),cancel_requested_at:new Date().toISOString()}).eq("email",email);
  if(error)return NextResponse.json({error:"Serviço indisponível."},{status:503});
  try{
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{authorization:`Bearer ${delivery.apiKey}`,"content-type":"application/json","Idempotency-Key":`housepro-optout/${hash(token)}`},
      body:JSON.stringify({from:delivery.sender,to:[email],subject:"Cancelar subscrição HousePro",
        text:`Pediu para deixar de receber os emails que subscreveu. Confirme em https://housepro.pt${path}\n\nSe não fez este pedido, ignore a mensagem. O link expira em 48 horas.`,
        html:houseproEmail("Cancelar subscrição",`Pediu para deixar de receber os emails que subscreveu. Confirme através do botão abaixo. Se não fez este pedido, ignore a mensagem. O link expira em 48 horas.`,{label:"Rever cancelamento",path}),
      }),signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)throw new Error("delivery_failed");
  }catch{
    await db.from("marketing_subscriptions").update({cancel_token_hash:null,cancel_requested_at:null}).eq("email",email).eq("cancel_token_hash",hash(token));
    return NextResponse.json({error:"Não foi possível enviar a confirmação."},{status:503});
  }
  return NextResponse.json({ok:true});
}
