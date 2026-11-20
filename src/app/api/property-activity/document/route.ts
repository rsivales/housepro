import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";
import { mayEditProperty,UUID } from "@/lib/portfolio/server";

export async function GET(request:Request) {
  const session=await getSession();
  const id=new URL(request.url).searchParams.get("id")??"";
  if(!session||session.demo||session.viewingAs||!hasServiceRole()||!UUID.test(id))return new Response(null,{status:403});
  const db=createAdminClient();
  const {data}=await db.from("property_activity_intakes").select("property_id,document_path,document_name").eq("id",id).maybeSingle();
  if(!data||!await mayEditProperty(session.agent,data.property_id))return new Response(null,{status:404});
  const {data:signed}=await db.storage.from("property-activity-private").createSignedUrl(data.document_path,60,{download:data.document_name});
  if(!signed)return new Response(null,{status:503});
  return NextResponse.redirect(signed.signedUrl,{headers:{"Cache-Control":"private, no-store"}});
}
