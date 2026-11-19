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
    <p className="text-sm text-muted-foreground">Patamares definidos pela Marca. Aplicados de forma progressiva à faturação; não há passagem a 100% por teto da agência.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr>{["Faturação acumulada","Com empresa","Sem empresa"].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>
      {["Inferior a 10.000 €","De 10.000 € a 59.999,99 €","A partir de 60.000 €"].map((label,i) => <tr key={label} className="border-t"><td className="p-3">{label}</td><td className="p-3">{plan.ladder[i].withCompany}%</td><td className="p-3">{plan.ladder[i].withoutCompany}%</td></tr>)}
    </tbody></table></div>
    <div><h3 className="font-semibold">Override por nível</h3><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{plan.overrideTiers.map((n, i) => <label className="text-sm" key={i}>Nível {i + 1} (%)<input type="number" min="0" max="20" step="0.01" value={n} onChange={e => setPlan(p => ({ ...p, overrideTiers: p.overrideTiers.map((v, j) => j === i ? Number(e.target.value) : v) }))} className={input} /></label>)}</div></div>
    <div><h3 className="font-semibold">Repartição de outras comissões</h3><p className="text-xs text-muted-foreground">Percentagem da comissão bruta atribuída ao consultor após validação do broker; o restante cabe à agência.</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{Object.entries(OTHER_INCOME_CATEGORIES).map(([key, label]) => <label className="text-sm" key={key}>{label} · consultor (%)<input type="number" min="0" max="100" step="0.01" value={plan.otherIncomeShares[key as keyof CommissionRegime["otherIncomeShares"]]} onChange={e => setPlan(p => ({ ...p, otherIncomeShares: { ...p.otherIncomeShares, [key]: Number(e.target.value) } }))} className={input} /></label>)}</div></div>
    <p className="text-sm text-muted-foreground">Nos negócios imobiliários, permanecem fixos por decisão da marca: royalties 3% da parcela de consultor e agência; pensão do consultor 2%; pensão do broker 2% da parcela da agência. Os fechos anteriores guardam a versão aplicada.</p>
    <button type="button" disabled={busy} onClick={save} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "A guardar…" : "Guardar regime"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
