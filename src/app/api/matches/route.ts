export const maxDuration = 120;
import { NextResponse, after } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { runMatching, workerConfig } from "@/lib/matching/server";
export async function GET(request:Request) {
 const s=await getSession();if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});if(s.demo)return NextResponse.json({matches:[],total:0});
 const url=new URL(request.url),page=Math.max(0,Math.min(1000,Number(url.searchParams.get("page"))||0));
 const filter=url.searchParams.get("filter")??"all",contactId=url.searchParams.get("contactId"),propertyId=url.searchParams.get("propertyId");
 if(!["all","read","unread"].includes(filter)||[contactId,propertyId].some(id=>id&&!/^[0-9a-f-]{36}$/i.test(id)))return NextResponse.json({error:"Filtro inválido."},{status:422});
 const sb=await createClient();const {data,error}=await sb.rpc("list_buyer_matches",{p_filter:filter,p_contact:contactId||null,p_property:propertyId||null,p_page:Math.floor(page)});
 if(error)return NextResponse.json({error:"Não foi possível carregar as correspondências."},{status:503});let automaticEmailsEnabled=false;try{automaticEmailsEnabled=(await workerConfig()).enabled;}catch{}return NextResponse.json({...data,automaticEmailsEnabled});
}
export async function POST(request:Request) {
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem escrita."},{status:403});
 const b=await request.json().catch(()=>null);if(typeof b?.contactId!=="string")return NextResponse.json({error:"Indique a ficha do comprador."},{status:422});
 const sb=await createClient();const {data}=await sb.from("contacts").select("id").eq("id",b.contactId).eq("owner_id",s.agent.id).maybeSingle();if(!data)return NextResponse.json({error:"Sem permissão."},{status:403});
 after(async()=>{await runMatching({contactId:data.id});});return NextResponse.json({queued:true});
}

export async function PATCH(request:Request){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem escrita."},{status:403});
 const b=await request.json().catch(()=>null);if(!b||typeof b.id!=="string"||!/^[0-9a-f-]{36}$/i.test(b.id)||typeof b.revision!=="string"||b.revision.length>100||typeof b.read!=="boolean")return NextResponse.json({error:"Dados inválidos."},{status:422});
 const sb=await createClient();const {data:m}=await sb.from("buyer_matches").select("id,revision").eq("id",b.id).or(`buyer_agent_id.eq.${s.agent.id},property_agent_id.eq.${s.agent.id}`).maybeSingle();if(!m)return NextResponse.json({error:"Sem permissão."},{status:403});if(m.revision!==b.revision)return NextResponse.json({error:"A sugestão foi atualizada. Atualize a lista."},{status:409});
 const {error}=await sb.from("buyer_match_receipts").upsert({match_id:m.id,user_id:s.agent.id,revision:m.revision,read_at:b.read?new Date().toISOString():null},{onConflict:"match_id,user_id"});return NextResponse.json(error?{error:"Não foi possível guardar a leitura."}:{ok:true},{status:error?503:200});
}
