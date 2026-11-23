import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {listDeals} from "@/lib/db/deals";
import {listAgenciesReal} from "@/lib/db/repo";
import {CrmBoard} from "@/components/app/crm-board";
export const metadata={title:'Negócios da rede · Marca — Helix'};
export default async function BrandCrm(){const s=await getSession();if(!s)redirect('/entrar');if(s.demo||!isNetworkFinanceAdmin(s.agent))redirect('/app');const [deals,agencies]=await Promise.all([listDeals(s.agent.id,true,{agencyId:s.agent.agencyId,global:true}),listAgenciesReal()]);return <main className="mx-auto max-w-7xl space-y-5 p-6"><h1 className="text-3xl font-semibold">Negócios da rede</h1><p className="text-sm text-muted-foreground">Visão de gestão da Marca. Na área de consultor, o CRM mostra apenas os negócios em que participas.</p><CrmBoard initial={deals} agencies={agencies.filter(a=>a.id!==s.agent.agencyId).map(a=>({id:a.id,name:a.name}))} canManage={!s.viewingAs} viewerId={s.agent.id}/></main>;}
