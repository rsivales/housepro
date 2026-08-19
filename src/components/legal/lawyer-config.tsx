"use client";

import * as React from "react";
import { Save, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PAYMENT_METHOD_LABEL,
  type LawyerConfig,
  type LawyerService,
  type PaymentMethod,
} from "@/lib/data/legalflow";

/**
 * Ambiente do advogado — configurar serviços, honorários base, prazos, métodos
 * de pagamento e condições. Grava em /api/legal/config.
 */
export function LawyerConfigEditor({ initial }: { initial: LawyerConfig }) {
  const [services, setServices] = React.useState<LawyerService[]>(initial.services);
  const [methods, setMethods] = React.useState<PaymentMethod[]>(initial.methods);
  const [note, setNote] = React.useState(initial.note ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<null | "ok" | "demo" | "err">(null);

  function patch(type: string, p: Partial<LawyerService>) {
    setServices((prev) => prev.map((s) => (s.type === type ? { ...s, ...p } : s)));
  }
  function toggleMethod(m: PaymentMethod) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/legal/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { services, methods, note: note || undefined } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSaved(data.demo ? "demo" : "ok");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Serviços & honorários */}
      <section>
        <h2 className="font-display text-xl">Serviços & honorários</h2>
        <div className="mt-3 space-y-2">
          {services.map((s) => (
            <div key={s.type} className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.active} onChange={(e) => patch(s.type, { active: e.target.checked })} />
                <span className="font-medium">{s.label}</span>
              </label>
              <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">€
                <input type="number" min={0} value={s.basePrice} onChange={(e) => patch(s.type, { basePrice: Number(e.target.value) })} className="input w-24" aria-label={`Honorário ${s.label}`} />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">prazo
                <input type="number" min={0} value={s.deadlineDays} onChange={(e) => patch(s.type, { deadlineDays: Number(e.target.value) })} className="input w-16" aria-label={`Prazo ${s.label}`} /> dias
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Métodos de pagamento */}
      <section>
        <h2 className="font-display text-xl">Métodos de pagamento aceites</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMethod(m)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${methods.includes(m) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
      </section>

      {/* Condições */}
      <section>
        <h2 className="font-display text-xl">Condições gerais</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input mt-3" placeholder="Ex.: honorários acrescidos de IVA…" />
      </section>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved === "ok" || saved === "demo" ? <Check className="size-4" /> : <Save className="size-4" />}
          Guardar configuração
        </Button>
        {saved === "demo" && <span className="text-xs text-muted-foreground">Guardado (demo — não persiste).</span>}
        {saved === "err" && <span className="text-xs text-destructive">Falha ao guardar.</span>}
      </div>
    </div>
  );
}
