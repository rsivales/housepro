import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleConfig, tokenRequest, writableCalendars, GOOGLE_SCOPE } from "@/lib/google-calendar";

export async function GET(request:NextRequest) {
 const cfg=googleConfig();const success=new URL("/app/agenda?google=connected",cfg?.redirect||"https://housepro.pt");
 const failure=new URL("/app/agenda?google=failed",success);
 const cookie=request.cookies.get("helix_google_calendar_state")?.value;
 const response=NextResponse.redirect(failure);
 response.cookies.delete({name:"helix_google_calendar_state",path:"/api/calendar/google/callback"});
 const session=await getSession();
 if(!cfg||!cookie||!session||session.demo||session.viewingAs||cookie!==`${session.agent.id}:${request.nextUrl.searchParams.get("state")}`||!request.nextUrl.searchParams.get("code"))return response;
 try {
  const token=await tokenRequest(new URLSearchParams({client_id:cfg.id,client_secret:cfg.secret,redirect_uri:cfg.redirect,code:request.nextUrl.searchParams.get("code")!,grant_type:"authorization_code"}));
  if(!token.refresh_token||!token.access_token||!GOOGLE_SCOPE.split(" ").every(scope=>token.scope?.split(" ").includes(scope)))return response;
  const calendars=await writableCalendars(token.access_token);
  const primary=calendars.find(c=>c.primary)??calendars[0];
  if(!primary)return response;
  const {error}=await createAdminClient().rpc("helix_set_google_calendar_connection",{p_profile:session.agent.id,p_refresh:token.refresh_token,p_calendar_id:primary.id,p_calendar_label:primary.summary});
  if(error)return response;
  const ok=NextResponse.redirect(success);
  ok.cookies.delete({name:"helix_google_calendar_state",path:"/api/calendar/google/callback"});
  return ok;
 }catch{return response;}
}
