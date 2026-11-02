import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.calendarlist.readonly";
export function googleConfig() {
 const id=process.env.GOOGLE_CALENDAR_CLIENT_ID;
 const secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
 const redirect=process.env.GOOGLE_CALENDAR_REDIRECT_URI;
 if(!id||!secret||!redirect||!redirect.startsWith("https://"))return null;
 return {id,secret,redirect};
}
export async function tokenRequest(params:URLSearchParams) {
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params.toString(),cache:"no-store"});
 if(!response.ok)throw new Error("google_token_failed");
 return await response.json() as {access_token:string;refresh_token?:string;scope?:string};
}
export async function googleAccess(profileId:string) {
 const cfg=googleConfig();if(!cfg)throw new Error("google_not_configured");
 const sb=createAdminClient();
 const {data:connection,error}=await sb.from("agent_google_calendar_connections").select("calendar_id,calendar_label").eq("profile_id",profileId).maybeSingle();
 if(error||!connection)throw new Error("google_not_connected");
 const {data:refresh,error:secretError}=await sb.rpc("helix_get_google_calendar_refresh",{p_profile:profileId});
 if(secretError||typeof refresh!=="string")throw new Error("google_token_unavailable");
 const token=await tokenRequest(new URLSearchParams({client_id:cfg.id,client_secret:cfg.secret,refresh_token:refresh,grant_type:"refresh_token"}));
 return {accessToken:token.access_token,calendarId:connection.calendar_id as string,calendarLabel:connection.calendar_label as string};
}
export async function googleRequest(url:string,token:string,method="GET",body?:unknown) {
 const response=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 return response;
}
export type GoogleCalendar={id:string;summary:string;primary?:boolean;accessRole?:string};
export async function writableCalendars(token:string) {
 const response=await googleRequest("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",token);
 if(!response.ok)throw new Error("google_calendars_failed");
 const json=await response.json() as {items?:GoogleCalendar[]};
 return (json.items??[]).filter(c=>c.accessRole==="owner").map(c=>({id:c.id,summary:c.summary,primary:Boolean(c.primary)}));
}
export function googleEvent(visit:{id:string;kind:string;at:string;durationMin?:number;contactName?:string;location?:string;propertyRef?:string;note?:string}) {
 const start=new Date(visit.at);
 if(!Number.isFinite(start.getTime()))throw new Error("invalid_event_time");
 const title={visita:"Visita",reuniao:"Reunião",avaliacao:"Avaliação",outro:"Evento"}[visit.kind]??"Evento";
 return {id:`hel${visit.id.replaceAll("-","").toLowerCase()}`,summary:`${title}${visit.contactName?` · ${visit.contactName}`:""}`,
  start:{dateTime:start.toISOString()},end:{dateTime:new Date(start.getTime()+(visit.durationMin||60)*60000).toISOString()},
  location:visit.location||"",description:[visit.propertyRef&&`Imóvel: ${visit.propertyRef}`,visit.note].filter(Boolean).join("\n\n")};
}
