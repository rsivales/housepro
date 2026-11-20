import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateFollowup} from "@/lib/leads/followup";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem escrita."},{status:403});const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Lead inválida."},{status:422});
 let b;try{b=validateFollowup(await request.json());}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Dados inválidos."},{status:422});}
 const {error}=await createAdminClient().rpc('record_lead_followup',{p_actor:s.agent.id,p_lead:id,p_action:b.action,p_note:b.note,p_next:b.nextAt,p_request:b.requestId});if(error)return NextResponse.json({error:"Não foi possível registar. Confirme a permissão e a data do próximo acompanhamento."},{status:403});return NextResponse.json({ok:true});
}
