import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export async function GET(request:Request) {
 const session=await getSession();
 if(!session||session.demo||session.viewingAs||!hasServiceRole()||!isStaff(session.agent))return NextResponse.json({error:"Acesso reservado à gestão da agência."},{status:403});
 const params=new URL(request.url).searchParams;
 const from=params.get("from")??"",until=params.get("until")??"";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(until)))return NextResponse.json({error:"Selecione um período válido."},{status:422});
 const {data,error}=await createAdminClient().rpc("property_activity_kpis",{
  p_actor:session.agent.id,p_from:from+"T00:00:00Z",p_until:new Date(Date.parse(until)+86400000).toISOString(),
 });
 if(error)return NextResponse.json({error:"Não foi possível calcular os indicadores."},{status:503});
 return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
}
