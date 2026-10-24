import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { hasServiceRole } from "@/lib/supabase/admin";
import { listDeals } from "@/lib/db/deals";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
export const metadata = { title: "Fundo de pensão — Helix" };
export default async function PensionPage() {
  const session=await getSession();if(!session)redirect("/entrar");
  if(!session.demo && !hasServiceRole()) throw new Error("pension_not_configured");
  const deals=session.demo?[]:await listDeals(session.agent.id,false);
  const closed=deals.filter(d=>d.stage==="concluido");
  const rows=closed.flatMap(d=>{const producer=d.financials?.producers.find(p=>p.id===session.agent.id);return producer?[{id:d.id,propertyId:d.propertyId,ref:d.propertyRef,date:d.updatedAt,base:producer.agentGross,amount:producer.pension}]:[];});
  const total=Math.round(rows.reduce((sum,r)=>sum+r.amount,0)*100)/100;
  let paid=0;
  if(!session.demo){const sb=await createClient();const {data,error}=await sb.from("payouts").select("amount").eq("beneficiary_id",session.agent.id).eq("role","pensao").eq("status","pago");if(error)throw new Error("pension_read_failed");paid=(data??[]).reduce((n,p)=>n+Number(p.amount),0);}
  const missing=closed.length-rows.length;
  return <main className="mx-auto max-w-3xl px-4 py-8"><Link href="/app" className="text-sm text-primary">← Área do consultor</Link><h1 className="mt-4 font-display text-3xl">Fundo de pensão</h1>
    <p className="mt-2 text-sm text-muted-foreground">Contribuições dos teus negócios concluídos, calculadas com a repartição de comissão registada no Helix.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><section className="rounded-2xl bg-primary p-6 text-primary-foreground"><h2 className="text-sm">Contribuições apuradas</h2><p className="mt-2 font-display text-4xl">{formatEuro(total)}</p><p className="mt-3 text-sm">{rows.length} negócio(s) · 2% do bruto atribuído ao consultor</p></section><section className="rounded-2xl border bg-card p-6"><h2 className="text-sm">Pagamentos registados no Helix</h2><p className="mt-2 font-display text-4xl">{formatEuro(paid)}</p><p className="mt-3 text-sm text-muted-foreground">{paid===0?"Ainda não há pagamentos de pensão marcados como pagos.":"Total de linhas de pensão com estado pago."}</p></section></div>
    <p className="mt-4 rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">As contribuições apuradas são valores a regularizar, calculados a partir dos negócios. Não comprovam capital depositado num fundo. Não existem registos de dividendos ou condições de levantamento para apresentar.</p>
    {missing>0&&<p role="status" className="mt-4 text-sm">{missing} negócio(s) com dados de comissão por completar; não incluídos no total.</p>}
    <h2 className="mt-8 font-display text-xl">Contribuições por negócio</h2><div className="mt-4 overflow-x-auto rounded-2xl border"><table className="w-full text-left text-sm"><thead className="bg-secondary"><tr><th className="p-3">Negócio</th><th className="p-3">Data</th><th className="p-3 text-right">Bruto do consultor</th><th className="p-3 text-right">Contribuição</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3"><Link href={`/app/crm/${r.id}`} className="font-semibold text-primary">{r.ref}</Link></td><td className="p-3">{new Date(r.date).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"})}</td><td className="p-3 text-right">{formatEuro(r.base)}</td><td className="p-3 text-right font-semibold">{formatEuro(r.amount)}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-6 text-sm text-muted-foreground">Sem contribuições apuradas de negócios concluídos.</p>}</div>
  </main>;
}
