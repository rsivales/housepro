import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {TOPICS,TICKET_STATUS} from "@/lib/support/topics";
const UUID=/^[0-9a-f-]{36}$/i;
export async function GET(request:Request){
 const s=await getSession();if(!s)return NextResponse.json({error:"Sessão inválida."},{status:401});if(s.demo||s.viewingAs)return NextResponse.json({tickets:[],total:0,metrics:{open:0,resolved:0,unassigned:0,byTopic:{}},messages:[],readOnly:true});
 const u=new URL(request.url),topic=u.searchParams.get('topic'),status=u.searchParams.get('status'),ticket=u.searchParams.get('ticket');if((topic&&!(topic in TOPICS))||(status&&!(status in TICKET_STATUS))||(ticket&&!UUID.test(ticket)))return NextResponse.json({error:"Filtro inválido."},{status:422});
 const {data,error}=await createAdminClient().rpc('support_dashboard',{p_actor:s.agent.id,p_topic:topic||null,p_status:status||null,p_page:Math.max(0,Math.min(10000,Math.floor(Number(u.searchParams.get('page'))||0))),p_ticket:ticket||null});
 if(error)return NextResponse.json({error:"Não foi possível carregar os tickets."},{status:503});return NextResponse.json({...data,readOnly:Boolean(s.viewingAs),agentId:s.agent.id});
}
export async function POST(request:Request){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem permissão de escrita."},{status:403});
 const b=await request.json().catch(()=>null);
 if(!b||typeof b.topic!=='string'||!(b.topic in TOPICS)||typeof b.subject!=='string'||b.subject.trim().length<8||b.subject.length>160||typeof b.description!=='string'||b.description.trim().length<15||b.description.length>10000||!['normal','alta','urgente'].includes(b.priority)|| (b.leadId&&!UUID.test(b.leadId)))return NextResponse.json({error:"Escolha um tópico, um assunto (8–160 caracteres) e uma descrição com pelo menos 15 caracteres."},{status:422});
 const {data,error}=await createAdminClient().rpc('create_support_ticket',{p_actor:s.agent.id,p_topic:b.topic,p_subject:b.subject,p_description:b.description,p_priority:b.priority,p_lead:b.leadId||null});if(error)return NextResponse.json({error:"Não foi possível criar. Confirme o acesso à lead associada."},{status:403});return NextResponse.json({id:data},{status:201});
}
export async function PATCH(request:Request){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"Sessão sem permissão de escrita."},{status:403});
 const b=await request.json().catch(()=>null);
 if(!b||!UUID.test(b.id)||!Number.isInteger(b.revision)||b.revision<1||(b.body!=null&&(typeof b.body!=='string'||b.body.trim().length<2||b.body.length>10000))||(b.status!=null&&!(b.status in TICKET_STATUS))||(b.claim!=null&&typeof b.claim!=='boolean')||(b.escalate!=null&&typeof b.escalate!=='boolean'))return NextResponse.json({error:"Atualização inválida."},{status:422});
 const {error}=await createAdminClient().rpc('update_support_ticket',{p_actor:s.agent.id,p_ticket:b.id,p_revision:b.revision,p_body:b.body||null,p_status:b.status||null,p_claim:b.claim===true,p_escalate:b.escalate===true});if(error)return NextResponse.json({error:error.message.includes('stale_revision')?"O ticket foi atualizado por outra pessoa. Atualize a lista antes de responder.":"Não foi possível atualizar o ticket."},{status:error.message.includes('stale_revision')?409:403});return NextResponse.json({ok:true});
}
