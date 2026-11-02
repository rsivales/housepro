import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { isCommercialAgent } from "@/lib/data/agent-directory";
import { ownOtherIncome } from "@/lib/db/other-income";
import { OTHER_INCOME_CATEGORIES } from "@/lib/data/commission-regime";
import { dayInLisbon } from "@/lib/data/agency-finance";
import { formatMoney } from "@/lib/data/finance-access";
import { OtherIncomeForm } from "@/components/consultant/other-income-form";

export const metadata = { title: "Outros rendimentos · Consultor — Helix" };
export default async function OtherIncomePage() {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (!isCommercialAgent(s.agent)) redirect("/app");
  const rows = s.demo ? [] : await ownOtherIncome(s.agent);
  const approved = rows.filter(r => r.status === "aprovado" || r.status === "pago");
  const sum = (items: typeof rows) => items.reduce((total, row) => total + Number(row.consultant_amount ?? 0), 0);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <Link href="/app/consultor" className="text-sm text-primary">← Área do consultor</Link>
    <div><h1 className="font-display text-3xl">Outros rendimentos</h1><p className="mt-2 text-sm text-muted-foreground">Crédito, certificados energéticos e parcerias, separados das transações imobiliárias.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[["Por receber (aprovado)",sum(rows.filter(r => r.status === "aprovado"))],["Pago (confirmado pelo broker)",sum(rows.filter(r => r.status === "pago"))],["Total atribuído",sum(approved)]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{formatMoney(Number(value))}</p></div>)}</div>
    {s.viewingAs || s.demo ? <p className="rounded-xl border p-4 text-sm">O registo de rendimentos requer a tua sessão real.</p> : <OtherIncomeForm today={dayInLisbon(new Date())} />}
    <section><h2 className="font-display text-xl">Os meus registos</h2><div className="mt-3 overflow-x-auto rounded-2xl border"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-secondary"><tr>{["Data","Origem","Parceiro e referência","Comissão bruta","A minha parte","Estado"].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="whitespace-nowrap p-3">{r.earned_on}</td><td className="p-3">{OTHER_INCOME_CATEGORIES[r.category]}</td><td className="p-3"><strong>{r.partner_name}</strong><br />{r.description}</td><td className="p-3">{formatMoney(Number(r.gross_amount))}</td><td className="p-3">{r.consultant_amount == null ? "Por apurar" : formatMoney(Number(r.consultant_amount))}</td><td className="p-3 capitalize">{r.status}</td></tr>)}</tbody></table>{!rows.length && <p className="p-5 text-sm text-muted-foreground">Ainda não há rendimentos registados.</p>}</div></section>
  </main>;
}
