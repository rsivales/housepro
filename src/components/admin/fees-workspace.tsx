"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HelixFeesWorkspace } from "@/lib/db/helix-fees";
import { currentFeeMonth } from "@/lib/data/helix-fees";
import { formatMoney } from "@/lib/data/finance-access";

export function FeesWorkspace({ data }: { data: HelixFeesWorkspace }) {
  const router = useRouter();
  const [agency, setAgency] = useState(data.managed[0]?.id ?? "");
  const [agent, setAgent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const profiles = data.profiles.filter((p) => p.agency_id === agency);
  const name = (id: string | null) => id ? data.profiles.find((p) => p.id === id)?.name ?? "Consultor" : "Agência";
  const agencyName = (id: string) => data.managed.find((a) => a.id === id)?.name ?? "Agência";
  async function action(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/finance/fees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível guardar."); }
    finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-xl border bg-background p-3";
  return <div className="space-y-5">
    {message && <p role="status" className="rounded-xl border p-3 text-sm">{message}</p>}
    {data.managed.length > 0 && <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Propor agente Pro Producer</h2>
      <label className="block text-sm">Agência<select className={field} value={agency} onChange={(e) => { setAgency(e.target.value); setAgent(""); }}>
        {data.managed.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label className="block text-sm">Agente<select className={field} value={agent} onChange={(e) => setAgent(e.target.value)}>
        <option value="">Escolher agente</option>
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}{p.pro_producer_since ? " · Pro Producer" : ""}</option>)}
      </select></label>
      <button type="button" disabled={!agent || busy} onClick={() => void action({ action: "propose", agencyId: agency, agentId: agent })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Enviar proposta à Marca · 80% / 300 €/mês</button>
    </section>}
    <section className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">Propostas e decisões</h2>
      {!data.requests.length && <p className="mt-3 text-sm text-muted-foreground">Sem propostas.</p>}
      {data.requests.map((r) => <article className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-sm" key={r.id}>
        <span className="flex-1">{name(r.agent_id)} · {agencyName(r.agency_id)} · {r.status}</span>
        {data.master && r.status === "pendente" && <>
          <button type="button" disabled={busy} className="font-semibold text-primary" onClick={() => void action({ action: "decide", id: r.id, approve: true })}>Aprovar</button>
          <button type="button" disabled={busy} onClick={() => void action({ action: "decide", id: r.id, approve: false })}>Recusar</button>
        </>}
      </article>)}
    </section>
    {data.master && <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Fee tecnológico · Marca</h2>
      <form className="mt-3 space-y-3" onSubmit={(e) => {
        e.preventDefault(); const fd = new FormData(e.currentTarget);
        void action({ action: "create_plan", agencyId: agency, agentId: fd.get("agentId") || null, amount: Number(fd.get("amount")), startsOn: String(fd.get("month")) + "-01" });
      }}>
        <p className="text-sm text-muted-foreground">Agência selecionada: {agencyName(agency)}. A cobrança é registada a favor da Marca.</p>
        <label className="block text-sm">Destinatário<select name="agentId" key={agency} className={field}>
          <option value="">A própria agência</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Valor mensal (€)<input name="amount" required type="number" min="0.01" max="100000" step="0.01" className={field} /></label>
          <label className="text-sm">Mês inicial<input name="month" required type="month" min={currentFeeMonth().slice(0,7)} defaultValue={currentFeeMonth().slice(0,7)} className={field} /></label>
        </div>
        <button disabled={busy || !agency} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Configurar fee</button>
      </form>
    </section>}
    <section className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">Fees tecnológicos configurados</h2>
      {!data.plans.length && <p className="mt-3 text-sm text-muted-foreground">A Marca ainda não configurou fees tecnológicos.</p>}
      {data.plans.map((p) => <div key={p.id} className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-sm">
        <span className="flex-1">{name(p.agent_id)} · {agencyName(p.agency_id)} · {formatMoney(Number(p.amount))}/mês · {p.starts_on}{p.stopped_at ? " · Terminado" : ""}</span>
        {data.master && !p.stopped_at && <button type="button" disabled={busy} className="text-primary" onClick={() => void action({ action: "stop_plan", id: p.id })}>Terminar fee</button>}
      </div>)}
    </section>
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Lançamentos mensais</h2>
        {data.master && <button type="button" disabled={busy} className="text-sm text-primary" onClick={() => void action({ action: "generate" })}>Verificar lançamentos do mês</button>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Débitos contabilísticos mensais. Não executa débitos bancários nem substitui faturação. Últimos 100 lançamentos.</p>
      {!data.charges.length && <p className="mt-3 text-sm">Sem lançamentos.</p>}
      {data.charges.map((c) => <article key={c.id} className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
        <div className="flex-1"><strong>{c.kind === "pro_producer" ? "Pro Producer" : "Tecnologia"}</strong><p>{c.month} · {name(c.agent_id)} · {agencyName(c.agency_id)}</p><p>A favor da {c.creditor === "marca" ? "Marca" : "agência"} · {c.status}</p></div>
        <strong>{formatMoney(Number(c.amount))}</strong>
        {data.master && c.status === "pendente" && <button type="button" disabled={busy} className="text-primary" onClick={() => void action({ action: "paid", id: c.id })}>Registar pagamento</button>}
      </article>)}
    </section>
  </div>;
}
