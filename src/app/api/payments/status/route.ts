import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {canManagePayout} from "@/lib/data/finance-access";
export async function POST(request:Request){
 const session=await getSession();if(!session||session.demo||session.viewingAs)return NextResponse.json({error:"Sessão inválida."},{status:401});
 const body=await request.json().catch(()=>null);const id=String(body?.id??"");const status=String(body?.status??"");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!["processado","pago"].includes(status))return NextResponse.json({error:"Dados inválidos."},{status:400});
 const sb=createAdminClient();const {data:p,error:readError}=await sb.from("payouts").select("id,status,agency_id,role").eq("id",id).maybeSingle();
 if(readError)return NextResponse.json({error:"Consulta indisponível."},{status:503});
 if(!p||!canManagePayout(session.agent,p))return NextResponse.json({error:"Sem permissão para este pagamento."},{status:403});
 if(p.status===status)return NextResponse.json({ok:true,status});
 if(!((p.status==="pendente"&&status==="processado")||(p.status==="processado"&&status==="pago")))return NextResponse.json({error:"Atualize o pagamento antes de continuar. A sequência é pendente, processado e pago."},{status:409});
 const {data:saved,error}=await sb.from("payouts").update({status,paid_at:status==="pago"?new Date().toISOString():null}).eq("id",id).eq("status",p.status).select("id").maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível guardar o pagamento."},{status:500});
 if(!saved)return NextResponse.json({error:"O pagamento foi alterado por outro utilizador. Atualize a página."},{status:409});
 return NextResponse.json({ok:true,status});
}
