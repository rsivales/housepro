import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleAccess, googleConfig, googleEvent, googleRequest, writableCalendars } from "@/lib/google-calendar";

const uuid=(v:unknown)=>typeof v==="string"&&/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
async function agent(){const s=await getSession();return s&&!s.demo&&!s.viewingAs?s.agent:null;}

export async function GET(){
 const a=await agent();if(!a)return NextResponse.json({error:"Sessão inválida."},{status:401});
 if(!googleConfig())return NextResponse.json({configured:false,connected:false,calendars:[]});
 const {data}=await createAdminClient().from("agent_google_calendar_connections").select("calendar_id,calendar_label").eq("profile_id",a.id).maybeSingle();
 if(!data)return NextResponse.json({configured:true,connected:false,calendars:[]});
 try{const token=await googleAccess(a.id);return NextResponse.json({configured:true,connected:true,selected:data.calendar_id,label:data.calendar_label,calendars:await writableCalendars(token.accessToken)});}
 catch{return NextResponse.json({configured:true,connected:true,selected:data.calendar_id,label:data.calendar_label,calendars:[],error:"A ligação ao Google expirou. Volta a ligar a conta."});}
}

export async function PATCH(request:Request){
 const a=await agent();if(!a)return NextResponse.json({error:"Sessão inválida."},{status:401});
 const b=await request.json().catch(()=>null);if(typeof b?.calendarId!=="string")return NextResponse.json({error:"Agenda inválida."},{status:422});
 try{const token=await googleAccess(a.id);const calendar=(await writableCalendars(token.accessToken)).find(c=>c.id===b.calendarId);if(!calendar)return NextResponse.json({error:"Esta agenda não pertence à tua conta."},{status:403});
  const {error}=await createAdminClient().from("agent_google_calendar_connections").update({calendar_id:calendar.id,calendar_label:calendar.summary}).eq("profile_id",a.id);if(error)throw error;return NextResponse.json({ok:true});}
 catch{return NextResponse.json({error:"Não foi possível escolher a agenda. Volta a ligar a conta."},{status:503});}
}

export async function DELETE(){
 const a=await agent();if(!a)return NextResponse.json({error:"Sessão inválida."},{status:401});
 const {error}=await createAdminClient().rpc("helix_disconnect_google_calendar",{p_profile:a.id});
 return error?NextResponse.json({error:"Não foi possível desligar a conta."},{status:503}):NextResponse.json({ok:true});
}

export async function POST(request:Request){
 const a=await agent();if(!a)return NextResponse.json({error:"Sessão inválida."},{status:401});
 const b=await request.json().catch(()=>null);if(!uuid(b?.visitId))return NextResponse.json({error:"Evento inválido."},{status:422});
 const {data:visit,error}=await createAdminClient().from("visits").select("id,owner_id,kind,at,duration_min,contact_name,location,property_ref,note").eq("id",b.visitId).eq("owner_id",a.id).maybeSingle();
 if(error||!visit)return NextResponse.json({error:"Evento não encontrado na tua agenda."},{status:404});
 try{
  const {accessToken,calendarId}=await googleAccess(a.id);
  const event=googleEvent({id:visit.id,kind:visit.kind,at:visit.at,durationMin:visit.duration_min,contactName:visit.contact_name,location:visit.location,propertyRef:visit.property_ref,note:visit.note});
  const base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  let result=await googleRequest(base,accessToken,"POST",event);
  if(result.status===409)result=await googleRequest(`${base}/${encodeURIComponent(event.id)}`,accessToken,"PUT",event);
  if(!result.ok)throw new Error("google_event_failed");
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível enviar. Confirma a ligação ao Google e tenta novamente."},{status:503});}
}
