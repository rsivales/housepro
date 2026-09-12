"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Home, Loader2, Plus, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import { DEAL_STEPS, dealStageToStatus } from "@/lib/data/deal";
import type { DealListItem } from "@/lib/db/deals";
import { STATUS_LABEL } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";

const ORDER = DEAL_STEPS.map((s) => s.stage);
const ACCENT = ["bg-slate-400", "bg-sky-400", "bg-violet-400", "bg-amber-400", "bg-orange-400", "bg-emerald-500"];

/** Kanban de negócios REAIS (persistidos). Ao mover um cartão de fase, o estado
 *  do imóvel muda automaticamente (reserva→reservado, cpcv→cpcv, escritura/
 *  concluído→vendido). Substitui o antigo kanban de exemplo. */
export function CrmBoard({ initial }: { initial: DealListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ reference: "", buyerName: "", sellerName: "", amount: "" });
  const [err, setErr] = React.useState<string | null>(null);

  const total = initial.reduce((s, d) => s + d.amount, 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reference.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/deals/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: form.reference.trim(),
          buyerName: form.buyerName,
          sellerName: form.sellerName,
          amount: form.amount ? Number(form.amount) : undefined,
        }),
      });
      const out = await res.json();
      if (res.ok) {
        setForm({ reference: "", buyerName: "", sellerName: "", amount: "" });
        setShowNew(false);
        router.refresh();
      } else {
        setErr(out.error === "property_missing" ? "Referência de imóvel não encontrada." : "Não foi possível criar o negócio.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function move(dealId: string, dir: 1 | -1, idx: number) {
    const to = ORDER[idx + dir];
    if (!to) return;
    setBusy(dealId);
    try {
      const res = await fetch("/api/deals/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, stage: to }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Área do consultor</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">CRM · Negócios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao avançar um negócio de fase, o <strong>estado do imóvel muda sozinho</strong>
            (reserva → reservado · CPCV → CPCV · escritura/concluído → vendido).
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Valor em pipeline</p>
              <p className="font-display text-xl leading-none">{formatEuro(total)}</p>
            </div>
          </div>
          <Button onClick={() => setShowNew((s) => !s)}><Plus className="size-4" /> Novo negócio</Button>
        </div>
      </div>

      {/* Novo negócio */}
      {showNew && (
        <form onSubmit={create} className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Referência (ex.: HP-1049)" />
            <Input value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))} placeholder="Comprador" />
            <Input value={form.sellerName} onChange={(e) => setForm((f) => ({ ...f, sellerName: e.target.value }))} placeholder="Vendedor" />
            <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Valor (€)" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" disabled={creating || !form.reference.trim()}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar
            </Button>
            {err && <span className="text-sm text-destructive">{err}</span>}
          </div>
        </form>
      )}

      {/* Quadro Kanban de negócios reais */}
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {DEAL_STEPS.map((step, i) => {
          const cards = initial.filter((d) => d.stage === step.stage);
          const soma = cards.reduce((s, d) => s + d.amount, 0);
          return (
            <div key={step.stage} className="w-72 shrink-0">
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", ACCENT[i] ?? "bg-slate-400")} />
                  <span className="text-sm font-semibold">{step.label}</span>
                  <span className="text-xs text-muted-foreground">({cards.length})</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatEuro(soma)}</span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {cards.map((d) => {
                  const status = dealStageToStatus(d.stage);
                  return (
                    <div key={d.id} className="rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{d.buyerName || "Comprador"}</p>
                        {status && (
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {STATUS_LABEL[status as PropertyStatus]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Home className="size-3.5" /> {d.propertyTitle || d.propertyRef}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-base">{d.amount ? formatEuro(d.amount) : "—"}</span>
                        {d.propertyId ? (
                          <Link href={`/imovel/${d.propertyId}`} className="text-[11px] text-primary hover:underline">Ref. {d.propertyRef}</Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Ref. {d.propertyRef}</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2">
                        {busy === d.id && <Loader2 className="mr-auto size-3.5 animate-spin text-muted-foreground" />}
                        <button onClick={() => move(d.id, -1, i)} disabled={i === 0 || busy === d.id} aria-label="Recuar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                          <ChevronLeft className="size-4" />
                        </button>
                        <button onClick={() => move(d.id, 1, i)} disabled={i === ORDER.length - 1 || busy === d.id} aria-label="Avançar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">Sem negócios</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {initial.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Ainda não há negócios. Clica em <strong>Novo negócio</strong> e usa a referência de um imóvel (ex.: HP-1049).
        </p>
      )}
    </div>
  );
}
