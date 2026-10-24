import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {agencyDashboard} from "@/lib/db/agency-finance";
import {agencyPeriod} from "@/lib/data/agency-finance";
export async function GET(request:Request){const s=await getSession();if(!s||s.demo)return NextResponse.json({error:"Sessão inválida."},{status:401});const q=new URL(request.url).searchParams;const id=q.get("agencyId")||"";if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Agência inválida."},{status:400});try{return NextResponse.json(await agencyDashboard(s.agent,id,agencyPeriod(q.get("from")||undefined,q.get("to")||undefined)),{headers:{"cache-control":"no-store"}});}catch(e){const code=e instanceof Error?e.message:"";return NextResponse.json({error:code==="forbidden"?"Sem acesso à gestão desta agência.":code==="invalid_period"?"Período inválido.":"Não foi possível consultar a agência."},{status:code==="forbidden"?403:code==="invalid_period"?400:503});}}
