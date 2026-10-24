import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { visibleLeadRows } from "@/lib/db/lead-access";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await getSession();if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id)||session.demo)return NextResponse.json({error:"not_found"},{status:404});
 const [lead]=await visibleLeadRows(session.agent,id);if(!lead)return NextResponse.json({error:"not_found"},{status:404});
 if(lead.contacted_at)return NextResponse.json({ok:true});
 const {error}=await createAdminClient().from("leads").update({contacted_at:new Date().toISOString(),contacted_by:session.agent.id,status:"contactado"}).eq("id",id).is("contacted_at",null);
 return NextResponse.json(error?{error:"save_failed"}:{ok:true},{status:error?500:200});
}
