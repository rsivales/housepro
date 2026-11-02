"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OTHER_INCOME_CATEGORIES } from "@/lib/data/commission-regime";

export function OtherIncomeForm({ today }: { today: string }) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/other-income", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), requestId: requestId.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      requestId.current = null; form.reset(); setMessage("Rendimento registado. Aguarda validação pelo broker."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível guardar."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} onChange={() => { requestId.current = null; }} className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
    <h2 className="font-display text-xl sm:col-span-2">Registar outro rendimento</h2>
    <label className="text-sm">Origem<select name="category" required disabled={busy} className="mt-1 block w-full rounded-xl border bg-background p-3">{Object.entries(OTHER_INCOME_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label className="text-sm">Data da comissão<input name="date" type="date" max={today} defaultValue={today} required disabled={busy} className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm sm:col-span-2">Parceiro / entidade<input name="partner" minLength={2} maxLength={160} required disabled={busy} placeholder="Ex.: intermediário de crédito ou certificador" className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm sm:col-span-2">Descrição / identificação<input name="description" minLength={3} maxLength={500} required disabled={busy} placeholder="Referência interna que permita identificar a origem" className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <label className="text-sm">Comissão bruta da parceria (€)<input name="gross" type="number" min="0.01" step="0.01" required disabled={busy} className="mt-1 block w-full rounded-xl border bg-background p-3" /></label>
    <p className="self-end text-xs text-muted-foreground">Este registo é submetido para validação. Não representa um recebimento bancário nem um pagamento efetuado.</p>
    <button disabled={busy} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "A guardar…" : "Submeter ao broker"}</button>
    {message && <p role="status" className="text-sm sm:col-span-2">{message}</p>}
  </form>;
}
