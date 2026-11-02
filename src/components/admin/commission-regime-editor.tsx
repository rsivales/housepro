"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { type CommissionRegime, OTHER_INCOME_CATEGORIES, validateRegime } from "@/lib/data/commission-regime";

export function CommissionRegimeEditor({ agencyId, initial, initialVersion }: { agencyId: string; initial: CommissionRegime; initialVersion: number }) {
  const router = useRouter();
  const [plan, setPlan] = useState<CommissionRegime>(initial);
  const [version, setVersion] = useState(initialVersion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function band(index: number, field: keyof CommissionRegime["ladder"][number], value: string) {
    setPlan(p => ({ ...p, ladder: p.ladder.map((b, i) => i === index ? { ...b, [field]: value === "" ? null : Number(value) } : b) }));
  }
  async function save() {
    setMessage("");
    if (!validateRegime(plan)) { setMessage("Reveja os limites: 3 patamares crescentes, percentagens de 0 a 100 e overrides até 20%."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/agencies/commission-regime", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ agencyId, plan, version }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setVersion(result.version); setMessage("Regime guardado. Será aplicado aos próximos negócios e validações."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível guardar."); }
    finally { setBusy(false); }
  }
  const input = "mt-1 w-full rounded-xl border bg-background p-3";
  return <section className="space-y-5 rounded-2xl border bg-card p-5">
    <h2 className="font-display text-xl">Comissão imobiliária · patamares</h2>
    <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr>{["Patamar","Até (€)","Com empresa (%)","Sem empresa (%)"].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{plan.ladder.map((b, i) => <tr key={i} className="border-t"><td className="p-2">{i + 1}</td><td className="p-2">{i === 2 ? "Sem limite" : <input aria-label={`Limite do patamar ${i + 1}`} type="number" min="1000" step="1" className={input} value={b.upTo ?? ""} onChange={e => band(i, "upTo", e.target.value)} />}</td>{(["withCompany", "withoutCompany"] as const).map(field => <td className="p-2" key={field}><input aria-label={`${field === "withCompany" ? "Com" : "Sem"} empresa, patamar ${i + 1}`} type="number" min="0" max="100" step="0.01" value={b[field]} className={input} onChange={e => band(i, field, e.target.value)} /></td>)}</tr>)}</tbody></table></div>
    <label className="block max-w-xs text-sm">Teto acumulado da parcela da agência (€)<input type="number" min="1000" max="10000000" step="1" value={plan.agencyCap} onChange={e => setPlan(p => ({ ...p, agencyCap: Number(e.target.value) }))} className={input} /></label>
    <div><h3 className="font-semibold">Override por nível</h3><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{plan.overrideTiers.map((n, i) => <label className="text-sm" key={i}>Nível {i + 1} (%)<input type="number" min="0" max="20" step="0.01" value={n} onChange={e => setPlan(p => ({ ...p, overrideTiers: p.overrideTiers.map((v, j) => j === i ? Number(e.target.value) : v) }))} className={input} /></label>)}</div></div>
    <div><h3 className="font-semibold">Repartição de outras comissões</h3><p className="text-xs text-muted-foreground">Percentagem da comissão bruta atribuída ao consultor após validação do broker; o restante cabe à agência.</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{Object.entries(OTHER_INCOME_CATEGORIES).map(([key, label]) => <label className="text-sm" key={key}>{label} · consultor (%)<input type="number" min="0" max="100" step="0.01" value={plan.otherIncomeShares[key as keyof CommissionRegime["otherIncomeShares"]]} onChange={e => setPlan(p => ({ ...p, otherIncomeShares: { ...p.otherIncomeShares, [key]: Number(e.target.value) } }))} className={input} /></label>)}</div></div>
    <p className="text-sm text-muted-foreground">Nos negócios imobiliários, permanecem fixos por decisão da marca: royalties 3% da parcela de consultor e agência; pensão do consultor 2%; pensão do broker 2% da parcela da agência. Os fechos anteriores guardam a versão aplicada.</p>
    <button type="button" disabled={busy} onClick={save} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "A guardar…" : "Guardar regime"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
