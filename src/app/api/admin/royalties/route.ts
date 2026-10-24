import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { readRoyaltyReport } from "@/lib/db/finance";
export async function GET(){const session=await getSession();if(!session||session.demo||!isNetworkFinanceAdmin(session.agent))return NextResponse.json({error:"Sem permissão."},{status:403});
 try{return NextResponse.json(await readRoyaltyReport(),{headers:{"cache-control":"no-store"}});}catch{return NextResponse.json({error:"Não foi possível consultar os royalties."},{status:503});}}
