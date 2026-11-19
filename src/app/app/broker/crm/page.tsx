import Link from "next/link";
import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {agencyWorkspaces,authorizedAgency} from "@/lib/db/agency-finance";
import {listDeals} from "@/lib/db/deals";
import {listAgenciesReal} from "@/lib/db/repo";
import {CrmBoard} from "@/components/app/crm-board";
export const metadata={title:'Negócios da agência · Broker — Helix'};
export default async function BrokerCrm({searchParams}:{searchParams:Promise<{agency?:string}>}){const s=await getSession();if(!s)redirect('/entrar');if(s.demo)redirect('/app');const all=await agencyWorkspaces(s.agent),q=await searchParams;const id=q.agency??(all.length===1?all[0].id:'');if(!id)return <main className="space-y-4 p-6"><h1 className="text-2xl">Negócios · escolher agência</h1>{all.map(a=><Link key={a.id} className="block text-primary" href={`?agency=${a.id}`}>{a.name}</Link>)}</main>;let agency;try{agency=await authorizedAgency(s.agent,id);}catch{return <main className="p-6">Sem acesso aos negócios desta agência.</main>;}const [deals,agencies]=await Promise.all([listDeals(s.agent.id,true,{agencyId:id,global:false}),listAgenciesReal()]);return <main className="mx-auto max-w-7xl space-y-5 p-6"><h1 className="text-3xl font-semibold">Negócios · {agency.name}</h1><p className="text-sm text-muted-foreground">Visão de gestão da agência. O CRM da área de consultor mantém apenas a carteira pessoal.</p><CrmBoard initial={deals} agencies={agencies.filter(a=>a.id!==id).map(a=>({id:a.id,name:a.name}))} canManage={!s.viewingAs}/></main>;}
