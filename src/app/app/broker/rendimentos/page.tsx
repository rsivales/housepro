import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { agencyWorkspaces, authorizedAgency } from "@/lib/db/agency-finance";
import { agencyOtherIncome } from "@/lib/db/other-income";
import { OTHER_INCOME_CATEGORIES } from "@/lib/data/commission-regime";
import { formatMoney } from "@/lib/data/finance-access";
import { OtherIncomeActions } from "@/components/admin/other-income-actions";

export const metadata = { title: "Rendimentos de parcerias · Broker — Helix" };
export default async function BrokerOtherIncomePage({ searchParams }: { searchParams: Promise<{ agency?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (s.demo) redirect("/app");
  const q = await searchParams;
  const workplaces = await agencyWorkspaces(s.agent);
  const agencyId = q.agency ?? (workplaces.length === 1 ? workplaces[0].id : "");
  if (!agencyId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl">Escolha a agência</h1>{workplaces.map(a => <Link key={a.id} className="mt-3 block text-primary" href={`?agency=${a.id}`}>{a.name} →</Link>)}</main>;
  let agency;
  try { agency = await authorizedAgency(s.agent, agencyId); }
  catch { return <main className="p-8">Sem acesso aos rendimentos desta agência.</main>; }
  const rows = await agencyOtherIncome(s.agent, agencyId);
  const active = rows.filter(r => r.status === "aprovado" || r.status === "pago");
  const total = (field: "gross_amount" | "consultant_amount" | "agency_amount") => active.reduce((n, r) => n + Number(r[field] ?? 0), 0);
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8"><Link href={`/app/broker?agency=${agencyId}`} className="text-sm text-primary">← Gestão da agência</Link><div><h1 className="font-display text-3xl">Rendimentos de parcerias</h1><p className="mt-1 text-sm text-muted-foreground">{agency.name} · crédito, certificados e outras parcerias</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[["Bruto validado",total("gross_amount")],["Parte dos consultores",total("consultant_amount")],["Parte da agência",total("agency_amount")]].map(([label, amount]) => <div key={String(label)} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{formatMoney(Number(amount))}</p></div>)}</div>
    <p className="text-sm text-muted-foreground">Estes montantes são registos de comissões de parcerias; não são recebimentos bancários nem fechos de imóveis. A marcação como pago requer confirmação do broker.</p>
    <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-secondary"><tr>{["Data","Consultor","Origem / parceiro","Bruto","Consultor","Agência","Estado","Ações"].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="p-3">{r.earned_on}</td><td className="p-3">{(Array.isArray(r.consultant) ? r.consultant[0] : r.consultant)?.name ?? "—"}</td><td className="p-3"><strong>{OTHER_INCOME_CATEGORIES[r.category]}</strong><br />{r.partner_name} · {r.description}</td><td className="p-3">{formatMoney(Number(r.gross_amount))}</td><td className="p-3">{r.consultant_amount == null ? "—" : formatMoney(Number(r.consultant_amount))}</td><td className="p-3">{r.agency_amount == null ? "—" : formatMoney(Number(r.agency_amount))}</td><td className="p-3 capitalize">{r.status}</td><td className="p-3">{!s.viewingAs && <OtherIncomeActions agencyId={agencyId} incomeId={r.id} status={r.status} />}</td></tr>)}</tbody></table>{!rows.length && <p className="p-5 text-sm">Ainda não existem comissões de parcerias nesta agência.</p>}</div>
  </main>;
}
