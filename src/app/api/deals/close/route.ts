import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { getDealGate, advanceDeal } from "@/lib/db/deals";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
export async function POST(request:Request) {
 const session=await getSession();
 if(!session||session.demo||session.viewingAs)return NextResponse.json({error:"Sessão inválida."},{status:401});
 const body=await request.json().catch(()=>null);const id=String(body?.dealId??"");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:"Abra o negócio real no CRM para concluir e registar os valores financeiros."},{status:422});
 const gate=await getDealGate(id);if(!gate)return NextResponse.json({error:"not_found"},{status:404});
 if(!dealTeamOrStaffAllowed(session.agent,gate))return NextResponse.json({error:"sem_permissao"},{status:403});
 const result=await advanceDeal(id,"concluido",session.agent.id);
 return NextResponse.json(result,{status:"error" in result?400:200});
}
