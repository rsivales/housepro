"use client";

import * as React from "react";
import { Check, History, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AuditEntry } from "@/lib/data/audit";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

interface EditProperty {
  id: string; reference: string; title: string; price: number; typology: string;
  beds: number; baths: number; area: number; status: string;
  shortDescription: string; description: string; commissionPct: number | "";
}

const STATUS = ["", "novo", "destaque", "reduzido", "oportunidade", "reservado", "vendido"];
const STATUS_LABEL: Record<string, string> = {
  "": "— (sem etiqueta)", novo: "Novo", destaque: "Destaque", reduzido: "Preço reduzido",
  oportunidade: "Oportunidade", reservado: "Reservado", vendido: "Vendido",
};

export function PropertyEditForm({
  property, audit, demo,
}: {
  property: EditProperty;
  audit: AuditEntry[];
  demo?: boolean;
}) {
  const [form, setForm] = React.useState(property);
  const [history, setHistory] = React.useState<AuditEntry[]>(audit);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<null | "ok" | "noop" | "err">(null);

  function set<K extends keyof EditProperty>(k: K, v: EditProperty[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const patch: Record<string, unknown> = {
      title: form.title,
      price: Number(form.price),
      typology: form.typology,
      beds: Number(form.beds),
      baths: Number(form.baths),
      area: Number(form.area),
      status: form.status,
      shortDescription: form.shortDescription,
      description: form.description,
      commissionPct: form.commissionPct === "" ? "" : Number(form.commissionPct),
    };
    try {
      const res = await fetch("/api/properties/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: property.id, patch }),
      });
      const data = await res.json();
      if (res.ok && data.noop) setMsg("noop");
      else if (res.ok && data.entry) { setHistory((h) => [data.entry, ...h]); setMsg("ok"); }
      else setMsg("err");
    } catch {
      setMsg("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {demo && (
        <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          Modo demo: as alterações registam-se no histórico mas só persistem de verdade com o Supabase ligado.
        </p>
      )}

      {/* Formulário */}
      <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
        <Field label="Título">
          <input className={box} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Preço (€)">
            <input className={box} inputMode="numeric" value={form.price} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </Field>
          <Field label="Tipologia">
            <input className={box} value={form.typology} onChange={(e) => set("typology", e.target.value)} placeholder="T3" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quartos"><input className={box} inputMode="numeric" value={form.beds} onChange={(e) => set("beds", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
          <Field label="Casas de banho"><input className={box} inputMode="numeric" value={form.baths} onChange={(e) => set("baths", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
          <Field label="Área (m²)"><input className={box} inputMode="numeric" value={form.area} onChange={(e) => set("area", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estado">
            <select className={box} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Comissão (%)">
            <input className={box} inputMode="decimal" value={form.commissionPct} onChange={(e) => set("commissionPct", e.target.value === "" ? "" : Number(e.target.value.replace(",", ".")) || 0)} placeholder="5" />
          </Field>
        </div>
        <Field label="Resumo">
          <input className={box} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
        </Field>
        <Field label="Descrição">
          <textarea className={cn(box, "min-h-28 resize-y")} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "A guardar…" : "Guardar alterações"}</Button>
          {msg === "ok" && <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="size-4" /> Guardado.</span>}
          {msg === "noop" && <span className="text-sm text-muted-foreground">Sem alterações.</span>}
          {msg === "err" && <span className="text-sm text-destructive">Falha ao guardar.</span>}
        </div>
      </div>

      {/* Histórico de rastreio */}
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-4" /> Histórico de alterações
        </h2>
        <ol className="mt-3 space-y-2">
          {history.map((e) => (
            <li key={e.id} className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-medium">{e.actorName}</span>
                  <span className="text-muted-foreground"> {e.action === "criou" ? "criou o imóvel" : "editou"}</span>
                  {e.actorRole && <span className="text-muted-foreground"> · {e.actorRole}</span>}
                </p>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              {e.changes && e.changes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {e.changes.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{c.field}:</span> {c.from} → {c.to}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sem alterações registadas.</li>
          )}
        </ol>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
