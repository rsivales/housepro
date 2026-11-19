import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {helixFeesWorkspace} from "@/lib/db/helix-fees";
import {FeesWorkspace} from "@/components/admin/fees-workspace";
export default async function BrandFees(){const s=await getSession();if(!s)redirect('/entrar');if(s.demo||!isNetworkFinanceAdmin(s.agent))redirect('/app');return <main className="mx-auto max-w-6xl space-y-5 p-6"><h1 className="text-3xl font-semibold">Fees e Pro Producer · Marca</h1>{s.viewingAs?<p>Termine «Ver como» para gerir.</p>:<FeesWorkspace data={await helixFeesWorkspace(s.agent,'brand')}/>}</main>;}
