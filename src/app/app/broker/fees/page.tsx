import Link from "next/link";
import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {agencyWorkspaces} from "@/lib/db/agency-finance";
import {helixFeesWorkspace} from "@/lib/db/helix-fees";
import {FeesWorkspace} from "@/components/admin/fees-workspace";
export default async function BrokerFees({searchParams}:{searchParams:Promise<{agency?:string}>}){const s=await getSession();if(!s)redirect('/entrar');if(s.demo)redirect('/app');const all=await agencyWorkspaces(s.agent),q=await searchParams;const id=q.agency??(all.length===1?all[0].id:'');if(!id)return <main className="space-y-4 p-6"><h1 className="text-2xl">Fees · escolher agência</h1>{all.map(a=><Link key={a.id} href={`?agency=${a.id}`} className="block text-primary">{a.name}</Link>)}</main>;let data;try{data=await helixFeesWorkspace(s.agent,'agency',id);}catch{return <main className="p-6">Sem acesso aos fees desta agência.</main>;}return <main className="mx-auto max-w-5xl space-y-5 p-6"><h1 className="text-3xl font-semibold">Fees e Pro Producer · {data.managed[0]?.name}</h1><p className="text-sm text-muted-foreground">Propostas da agência para decisão da Marca. Pro Producer: 80% e fee de 300 €/mês à agência.</p>{s.viewingAs?<p>Vista de consulta. Termine «Ver como» para gerir.</p>:<FeesWorkspace data={data}/>}</main>;}
