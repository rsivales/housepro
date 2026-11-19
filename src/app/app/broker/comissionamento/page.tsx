import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { agencyWorkspaces, authorizedAgency } from "@/lib/db/agency-finance";
import { readCommissionRegime } from "@/lib/db/commission-regime";
import { CommissionRegimeEditor } from "@/components/admin/commission-regime-editor";

import {commissionTeam,managementRequests} from "@/lib/db/commission-management";
import {CommissionTeam} from "@/components/admin/commission-team";
import {ManagementRequests} from "@/components/admin/management-requests";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
export const metadata = { title: "Regime de comissionamento · Broker — Helix" };
export default async function CommissionRegimePage({ searchParams }: { searchParams: Promise<{ agency?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (s.demo) redirect("/app");
  const q = await searchParams;
  const workplaces = await agencyWorkspaces(s.agent);
  const agencyId = q.agency ?? (workplaces.length === 1 ? workplaces[0].id : "");
  if (!agencyId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl">Escolha a agência</h1>{workplaces.map(a => <Link key={a.id} className="mt-3 block text-primary" href={`?agency=${a.id}`}>{a.name} →</Link>)}</main>;
  let agency;
  try { agency = await authorizedAgency(s.agent, agencyId); }
  catch { return <main className="p-8">Sem acesso ao comissionamento desta agência.</main>; }
  const [{plan,version},team,requests]=await Promise.all([readCommissionRegime(agencyId),commissionTeam(s.agent,agencyId),managementRequests(s.agent,agencyId)]);
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><Link href={`/app/broker?agency=${agencyId}`} className="text-sm text-primary">Gestão da agência</Link><div><h1 className="font-display text-3xl">Equipa e comissionamento</h1><p className="mt-1 text-sm text-muted-foreground">{agency.name} · regime versão {version||"padrão"}</p></div><div className="flex flex-wrap gap-3"><Link href="/app/fees" className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary">Propor Pro Producer e consultar fees</Link>{isNetworkFinanceAdmin(s.agent)&&<Link href="/app/aprovacoes-comissoes" className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary">Autorizações da Marca</Link>}</div>{s.viewingAs&&<p className="rounded-xl border p-4">Vista de consulta. Termine «Ver como» para enviar pedidos ou decidir.</p>}<CommissionTeam team={team} readOnly={Boolean(s.viewingAs)}/><CommissionRegimeEditor agencyId={agencyId} initial={plan} initialVersion={version} readOnly={Boolean(s.viewingAs)}/><ManagementRequests requests={requests} canDecide={isNetworkFinanceAdmin(s.agent)&&!s.viewingAs}/></main>;
}
