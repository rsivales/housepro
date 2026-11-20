import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  const token=String(body?.token??"");
  if(!hasServiceRole()||!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:"Link inválido."},{status:422});
  const db=createAdminClient();
  const hash=createHash("sha256").update(token).digest("hex");
  const {data:row}=await db.from("marketing_subscriptions").select("email,pending_name,pending_offers,pending_news,requested_at").eq("pending_token_hash",hash).maybeSingle();
  if(!row?.requested_at||Date.now()-Date.parse(row.requested_at)>48*3600000)return NextResponse.json({error:"O link expirou ou já foi utilizado."},{status:422});
  const {error}=await db.from("marketing_subscriptions").update({name:row.pending_name??"",offers:row.pending_offers===true,
    news:row.pending_news===true,confirmed_at:new Date().toISOString(),unsubscribed_at:null,
    pending_token_hash:null,pending_name:null,pending_offers:null,pending_news:null,
  }).eq("email",row.email).eq("pending_token_hash",hash);
  return NextResponse.json(error?{error:"Não foi possível confirmar."}:{ok:true},{status:error?503:200});
}
