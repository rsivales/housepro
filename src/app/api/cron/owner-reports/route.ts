import { NextResponse } from "next/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import { equalSecret, ownerReportWorkerSecret, runOwnerReports } from "@/lib/owner-reports/worker";

export const runtime="nodejs";
export const maxDuration=120;
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  if(!hasServiceRole())return NextResponse.json({error:"Serviço indisponível."},{status:503});
  const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  if(!token)return NextResponse.json({error:"Acesso reservado."},{status:401});
  try {
    if(!equalSecret(token,await ownerReportWorkerSecret()))return NextResponse.json({error:"Acesso reservado."},{status:401});
    return NextResponse.json(await runOwnerReports());
  }catch{return NextResponse.json({error:"Não foi possível executar os relatórios."},{status:503});}
}
