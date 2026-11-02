import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { agencyWorkspaces, authorizedAgency } from "@/lib/db/agency-finance";
import { readCommissionRegime } from "@/lib/db/commission-regime";
import { CommissionRegimeEditor } from "@/components/admin/commission-regime-editor";

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
  const { plan, version } = await readCommissionRegime(agencyId);
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8"><Link href={`/app/broker?agency=${agencyId}`} className="text-sm text-primary">← Gestão da agência</Link><div><h1 className="font-display text-3xl">Regime de comissionamento</h1><p className="mt-1 text-sm text-muted-foreground">{agency.name} · versão {version || "padrão"}</p></div><p className="rounded-xl border p-4 text-sm">As alterações são aplicadas aos próximos fechos imobiliários e às próximas validações de rendimentos de parcerias. Os negócios fechados e rendimentos já validados não são recalculados.</p>{s.viewingAs ? <p className="rounded-xl border p-4">Termine a vista «Ver como» para alterar o regime.</p> : <CommissionRegimeEditor agencyId={agencyId} initial={plan} initialVersion={version} />}</main>;
}
