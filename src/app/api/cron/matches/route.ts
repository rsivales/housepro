import { NextResponse } from "next/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import { workerConfig, tokensEqual, runMatching } from "@/lib/matching/server";
export const runtime="nodejs";
export const maxDuration=120;
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!hasServiceRole())return NextResponse.json({error:"unavailable"},{status:503});
 const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!token)return NextResponse.json({error:"unauthorized"},{status:401});
 try{const config=await workerConfig();if(!tokensEqual(token,config.secret))return NextResponse.json({error:"unauthorized"},{status:401});if(!config.enabled)return NextResponse.json({status:"disabled"});const result=await runMatching();return NextResponse.json(result,{status:result.status==="error"?503:200});}catch{return NextResponse.json({error:"unavailable"},{status:503});}
}
