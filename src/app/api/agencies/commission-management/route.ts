import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {authorizedAgency} from "@/lib/db/agency-finance";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {validAgentPolicy} from "@/lib/data/commission-cycle";
import {validateRegime} from "@/lib/data/commission-regime";
import {createAdminClient} from "@/lib/supabase/admin";
import {uuid as isUuid} from "@/lib/data/helix-fees";
export async function POST(request:Request){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Termine a visualização e use a sua sessão real."},{status:401});
 const b=await request.json().catch(()=>null);if(!b)return NextResponse.json({error:"Pedido inválido."},{status:400});
 if(b.action==="decide"){
  if(!isNetworkFinanceAdmin(s.agent))return NextResponse.json({error:"Apenas a Marca pode autorizar alterações."},{status:403});
  if(!isUuid(b.id)||typeof b.approve!=="boolean"||typeof b.note!=="string"||b.note.trim().length<5||b.note.length>2000)return NextResponse.json({error:"Indique a decisão e uma justificação com 5 a 2000 caracteres."},{status:422});
  const {error}=await createAdminClient().rpc("decide_agency_management",{p_request:b.id,p_approve:b.approve,p_note:b.note.trim(),p_actor:s.agent.id});
  if(error)return NextResponse.json({error:"O pedido já foi decidido, ficou desatualizado ou não pôde ser autorizado. Atualize a página."},{status:409});
  return NextResponse.json({ok:true});
 }
 if(b.action!=="request"||!isUuid(b.agencyId)||!Number.isSafeInteger(b.version)||b.version<0||typeof b.reason!=="string"||b.reason.trim().length<10||b.reason.length>2000||!['regime','agent_policy'].includes(b.kind))return NextResponse.json({error:"Reveja os dados e indique uma justificação com pelo menos 10 caracteres."},{status:422});
 try{await authorizedAgency(s.agent,b.agencyId);}catch{return NextResponse.json({error:"Sem acesso à agência."},{status:403});}
 if(b.kind==='regime'?!validateRegime(b.payload):!isUuid(b.agentId)||!validAgentPolicy(b.payload))return NextResponse.json({error:"Reveja as percentagens, data de entrada e objetivos."},{status:422});
 const {data,error}=await createAdminClient().rpc("request_agency_management",{p_agency:b.agencyId,p_agent:b.kind==='regime'?null:b.agentId,p_kind:b.kind,p_payload:b.payload,p_version:b.version,p_reason:b.reason.trim(),p_actor:s.agent.id});
 if(error)return NextResponse.json({error:"Já existe um pedido pendente, os dados foram alterados ou o pedido não pôde ser registado. Atualize a página."},{status:409});
 return NextResponse.json({ok:true,id:data,pending:true});
}
