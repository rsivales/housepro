import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {managementRequests} from "@/lib/db/commission-management";
import {ManagementRequests} from "@/components/admin/management-requests";
export const metadata={title:"Autorizações de comissionamento · Marca — Helix"};
export default async function ApprovalsPage(){const s=await getSession();if(!s)redirect("/entrar");if(s.demo||!isNetworkFinanceAdmin(s.agent))redirect("/app");return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"><div><h1 className="font-display text-3xl">Autorizações de comissionamento</h1><p className="mt-2 text-muted-foreground">Área da Marca · pedidos das agências para revisão de overrides, repartições, datas de entrada e objetivos.</p></div><ManagementRequests requests={await managementRequests(s.agent)} canDecide={!s.viewingAs}/></main>;}
