import Link from "next/link";
import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {agencyDashboard,agencyWorkspaces} from "@/lib/db/agency-finance";
import {agencyPeriod} from "@/lib/data/agency-finance";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {AgencyDashboardView} from "@/components/admin/agency-dashboard";
export const metadata={title:"Gestão da agência · Broker — Helix"};
export default async function BrokerPage({searchParams}:{searchParams:Promise<{agency?:string;from?:string;to?:string}>}){const s=await getSession();if(!s)redirect("/entrar");if(s.demo)redirect("/app");const q=await searchParams;const workspaces=await agencyWorkspaces(s.agent);const id=q.agency||(workspaces.length===1?workspaces[0].id:undefined);if(!id)return <main className="mx-auto max-w-4xl px-4 py-8"><h1 className="font-display text-3xl">Gestão de agências</h1><div className="mt-5 grid gap-4 sm:grid-cols-2">{workspaces.map(a=><Link key={a.id} href={`/app/broker?agency=${a.id}`} className="rounded-2xl border p-5"><h2 className="font-semibold">{a.name}</h2><p className="mt-2 text-sm">Broker: {a.brokerName||"Por definir"}</p><p className="mt-3 text-sm text-primary">Abrir gestão →</p></Link>)}</div>{!workspaces.length&&<p className="mt-5">Não tem uma agência associada à sua conta como broker.</p>}</main>;
 try{const data=await agencyDashboard(s.agent,id,agencyPeriod(q.from,q.to));return <AgencyDashboardView data={data} readOnly={Boolean(s.viewingAs)} canAssign={isNetworkFinanceAdmin(s.agent)}/>;}catch{return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-2xl">Não foi possível abrir a gestão desta agência.</h1><p className="mt-3">Verifique o acesso e o período selecionado.</p><Link href="/app/broker" className="mt-4 inline-block text-primary">Voltar às minhas agências</Link></main>;}}
