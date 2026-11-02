import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { googleConfig, GOOGLE_SCOPE } from "@/lib/google-calendar";

export async function GET() {
 const session=await getSession();
 if(!session||session.demo||session.viewingAs)return NextResponse.redirect(new URL("/app/agenda?google=invalid_session",process.env.GOOGLE_CALENDAR_REDIRECT_URI||"https://housepro.pt"));
 const cfg=googleConfig();if(!cfg)return NextResponse.redirect(new URL("/app/agenda?google=not_configured","https://housepro.pt"));
 const state=randomBytes(32).toString("hex");
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 for(const [key,value] of Object.entries({client_id:cfg.id,redirect_uri:cfg.redirect,response_type:"code",scope:GOOGLE_SCOPE,access_type:"offline",prompt:"consent select_account",state}))url.searchParams.set(key,value);
 const response=NextResponse.redirect(url);
 response.cookies.set("helix_google_calendar_state",`${session.agent.id}:${state}`,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/calendar/google/callback",maxAge:600});
 return response;
}
