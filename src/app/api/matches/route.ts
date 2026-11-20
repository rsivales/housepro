export const maxDuration = 120;
import { NextResponse, after } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { runMatching, workerConfig } from "@/lib/matching/server";
export async function GET(request:Request) {
 const s=await getSession();if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});if(s.demo)return NextResponse.json({matches:[],total:0});
 const url=new URL(request.url),page=Math.max(0,Math.min(1000,Number(url.searchParams.get("page"))||0));
 const sb=await createClient();let q=sb.from("buyer_matches").select("id,contact_id,property_id,buyer_agent_id,property_agent_id,qualification_ref,score,exact,summary,updated_at",{count:"exact"}).eq("active",true).or(`buyer_agent_id.eq.${s.agent.id},property_agent_id.eq.${s.agent.id}`).order("score",{ascending:false}).order("id").range(page*30,page*30+29);
 const contactId=url.searchParams.get("contactId"),propertyId=url.searchParams.get("propertyId");
 if(contactId)q=q.eq("contact_id",contactId);if(propertyId)q=q.eq("property_id",propertyId);
 const {data,error,count}=await q;if(error)return NextResponse.json({error:"Não foi possível carregar as correspondências."},{status:503});let automaticEmailsEnabled=false;try{automaticEmailsEnabled=(await workerConfig()).enabled;}catch{}return NextResponse.json({matches:data,total:count??0,automaticEmailsEnabled});
}
export async function POST(request:Request) {
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem escrita."},{status:403});
 const b=await request.json().catch(()=>null);if(typeof b?.contactId!=="string")return NextResponse.json({error:"Indique a ficha do comprador."},{status:422});
 const sb=await createClient();const {data}=await sb.from("contacts").select("id").eq("id",b.contactId).eq("owner_id",s.agent.id).maybeSingle();if(!data)return NextResponse.json({error:"Sem permissão."},{status:403});
 after(async()=>{await runMatching({contactId:data.id});});return NextResponse.json({queued:true});
}
