// Legacy button uses the same audited follow-up operation as the full form.
import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem escrita."},{status:403});const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Lead inválida."},{status:422});
 const {error}=await createAdminClient().rpc('record_lead_followup',{p_actor:s.agent.id,p_lead:id,p_action:'contactado',p_note:'Contacto realizado e confirmado pelo consultor.',p_next:new Date(Date.now()+48*3600000).toISOString(),p_request:randomUUID()});return NextResponse.json(error?{error:"Não foi possível guardar."}:{ok:true},{status:error?403:200});
}
