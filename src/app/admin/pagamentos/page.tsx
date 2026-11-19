import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {listFinancialPayouts,mapFinancialPayout} from "@/lib/db/finance";
import {PaymentsBoard} from "@/components/consultant/payments-board";
export default async function BrandPayments(){const s=await getSession();if(!s)redirect('/entrar');if(s.demo||!isNetworkFinanceAdmin(s.agent))redirect('/app');return <main className="mx-auto max-w-6xl p-6"><h1 className="text-3xl font-semibold">Pagamentos · gestão da Marca</h1><p className="mt-2 text-muted-foreground">Visão de gestão da rede, incluindo royalties.</p><PaymentsBoard showPersonalPension={false} initial={(await listFinancialPayouts(s.agent)).map(mapFinancialPayout)} canManage={!s.viewingAs} canManageRoyalties={!s.viewingAs}/></main>;}
