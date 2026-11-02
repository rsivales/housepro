"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CASH_CATEGORIES, CASH_INCOME_CATEGORIES } from "@/lib/data/agency-finance";

export function RecurringExpensesForm({ agencyId, today, readOnly }: { agencyId: string; today: string; readOnly: boolean }) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/agencies/recurring-expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), agencyId, requestId: requestId.current }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      requestId.current = null; form.reset(); setMessage(`${result.months} mensalidades previstas criadas. Confirme cada despesa quando for paga.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível guardar."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} onChange={() => { requestId.current = null; }} className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
    <div className="sm:col-span-2"><h3 className="font-display text-xl">Despesas mensais</h3><p className="mt-1 text-xs text-muted-foreground">Registe uma vez renda, telecomunicações, portais e outros contratos. O Helix cria os meses previstos sem os tratar como pagamentos já efetuados.</p></div>
    <label className="text-sm">Categoria<select name="category" disabled={readOnly || busy} className="mt-1 block w-full rounded-xl border bg-background p-3">{Object.entries(CASH_CATEGORIES).filter(([key]) => !CASH_INCOME_CATEGORIES.some(x => x === key)).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
    <label className="text-sm">Valor por mês (€)<input type="number" name="amount" required min="0.01" step="0.01" disabled={readOnly || busy} className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm sm:col-span-2">Contrato / fornecedor<input name="description" required minLength={3} maxLength={500} placeholder="Ex.: Renda do escritório, NOS, Idealista" disabled={readOnly || busy} className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm">Primeira mensalidade<input type="date" name="start" required defaultValue={today} disabled={readOnly || busy} className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm">Manter o mesmo valor durante<select name="months" defaultValue="12" disabled={readOnly || busy} className="mt-1 block w-full rounded-xl border bg-background p-3">{[3, 6, 12, 24, 36, 60].map(n => <option key={n} value={n}>{n} meses</option>)}</select></label>
    <p className="text-xs text-muted-foreground sm:col-span-2">Se o contrato mudar ou terminar, pode parar as mensalidades futuras e criar um novo plano. O dia 29, 30 ou 31 é ajustado ao último dia dos meses mais curtos.</p>
    <button disabled={readOnly || busy} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "A guardar…" : "Criar mensalidades"}</button>
    {message && <p role="status" className="text-sm sm:col-span-2">{message}</p>}
  </form>;
}

export function StopExpenseSeries({ agencyId, seriesId, disabled }: { agencyId: string; seriesId: string; disabled: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function stop() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/agencies/recurring-expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agencyId, seriesId, action: "stop" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível parar."); }
    finally { setBusy(false); }
  }
  return <span><button type="button" onClick={stop} disabled={disabled || busy} className="rounded-full border px-3 py-2 text-xs disabled:opacity-50">Parar mensalidades futuras</button>{error && <span role="alert" className="text-xs">{error}</span>}</span>;
}
