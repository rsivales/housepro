import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { listFinancialPayouts } from "@/lib/db/finance";
import { formatMoney as formatEuro } from "@/lib/data/finance-access";
export const metadata = { title: "Fundo de pensão — Helix" };
export default async function PensionPage() {
  const session=await getSession();if(!session)redirect("/entrar");
  const payouts=session.demo?[]:await listFinancialPayouts(session.agent,true);
  const rows=payouts.filter(p=>["pensao","pensao_broker"].includes(p.role)).map(p=>{
    const closure=Array.isArray(p.closure)?p.closure[0]:p.closure;
    const producer=closure?.snapshot?.financials?.producers?.find((x:{id:string})=>x.id===session.agent.id);
    return {id:p.id,dealId:p.deal_id,ref:p.deal_ref,date:closure?.closed_at||p.created_at,side:p.role==="pensao_broker"?"Broker":"Consultor",base:Number(p.contribution_base??(p.role==="pensao_broker"?closure?.snapshot?.broker?.base:producer?.agentGross)??0),amount:Number(p.amount),status:p.status};
  });
  const total=Math.round(rows.reduce((sum,r)=>sum+r.amount,0)*100)/100;
  const paid=Math.round(rows.filter(r=>r.status==="pago").reduce((sum,r)=>sum+r.amount,0)*100)/100;
  return <main className="mx-auto max-w-3xl px-4 py-8"><Link href="/app" className="text-sm text-primary">← Área do consultor</Link><h1 className="mt-4 font-display text-3xl">Fundo de pensão</h1>
    <p className="mt-2 text-sm text-muted-foreground">Deduções de pensão registadas automaticamente no fecho dos teus negócios, com valores fixados nessa data.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><section className="rounded-2xl bg-primary p-6 text-primary-foreground"><h2 className="text-sm">Deduções registadas</h2><p className="mt-2 font-display text-4xl">{formatEuro(total)}</p><p className="mt-3 text-sm">{rows.length} contribuição(ões) · consultor e broker discriminados abaixo</p></section><section className="rounded-2xl border bg-card p-6"><h2 className="text-sm">Transferências confirmadas no Helix</h2><p className="mt-2 font-display text-4xl">{formatEuro(paid)}</p><p className="mt-3 text-sm text-muted-foreground">{paid===0?"Ainda não há pagamentos de pensão marcados como pagos.":"Total de linhas de pensão com estado pago."}</p></section></div>
    <p className="mt-4 rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">O total de deduções corresponde ao registo contabilístico dos fechos. A coluna de estado distingue valores pendentes, processados e pagos. O registo de uma dedução não confirma, por si, uma transferência para uma entidade gestora.</p>

    <h2 className="mt-8 font-display text-xl">Contribuições por negócio</h2><div className="mt-4 overflow-x-auto rounded-2xl border"><table className="w-full text-left text-sm"><thead className="bg-secondary"><tr><th className="p-3">Negócio</th><th className="p-3">Função</th><th className="p-3">Data</th><th className="p-3 text-right">Base da contribuição</th><th className="p-3 text-right">Contribuição</th><th className="p-3">Estado</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3"><Link href={`/app/crm/${r.dealId}`} className="font-semibold text-primary">{r.ref}</Link></td><td className="p-3">{r.side}</td><td className="p-3">{new Date(r.date).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"})}</td><td className="p-3 text-right">{formatEuro(r.base)}</td><td className="p-3 text-right font-semibold">{formatEuro(r.amount)}</td><td className="p-3">{r.status==="pago"?"Pago":r.status==="processado"?"Processado":"Pendente"}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-6 text-sm text-muted-foreground">Sem contribuições apuradas de negócios concluídos.</p>}</div>
  </main>;
}
