"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import { DEAL_STEPS, dealStageToStatus, type DealStage } from "@/lib/data/deal";
import type { DealListItem } from "@/lib/db/deals";
import { STATUS_LABEL } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";

const ORDER = DEAL_STEPS.map((s) => s.stage);

export function DealsBoard({ initial }: { initial: DealListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ reference: "", buyerName: "", sellerName: "", amount: "" });
  const [err, setErr] = React.useState<string | null>(null);

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
        router.refresh();
      } else {
        setErr(out.error === "property_missing" ? "Referência de imóvel não encontrada." : "Não foi possível criar o negócio.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function advance(dealId: string, stage: DealStage) {
    setBusy(dealId);
    try {
      const res = await fetch("/api/deals/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, stage }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Novo negócio */}
      <form onSubmit={create} className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-sm font-medium"><Plus className="size-4 text-primary" /> Novo negócio</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Referência (ex.: HP-1049)" />
          <Input value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))} placeholder="Comprador" />
          <Input value={form.sellerName} onChange={(e) => setForm((f) => ({ ...f, sellerName: e.target.value }))} placeholder="Vendedor" />
          <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Valor (€)" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" disabled={creating || !form.reference.trim()}>
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar negócio
          </Button>
          {err && <span className="text-sm text-destructive">{err}</span>}
        </div>
      </form>

      {/* Lista de negócios */}
      {initial.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sem negócios. Crie um a partir da referência de um imóvel.
        </p>
      ) : (
        <ul className="space-y-4">
          {initial.map((d) => {
            const idx = ORDER.indexOf(d.stage);
            const status = dealStageToStatus(d.stage);
            return (
              <li key={d.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {d.propertyId ? (
                        <Link href={`/imovel/${d.propertyId}`} className="text-primary hover:underline">{d.propertyRef}</Link>
                      ) : (
                        d.propertyRef
                      )}
                      {d.propertyTitle ? <span className="text-muted-foreground"> · {d.propertyTitle}</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[d.buyerName && `Comprador: ${d.buyerName}`, d.sellerName && `Vendedor: ${d.sellerName}`, d.amount ? formatEuro(d.amount) : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  {status && (
                    <span className="rounded-full bg-[var(--muted,#eef)] px-2.5 py-1 text-xs font-medium text-foreground">
                      Imóvel: {STATUS_LABEL[status as PropertyStatus]}
                    </span>
                  )}
                </div>

                {/* Stepper */}
                <ol className="mt-4 flex flex-wrap gap-1.5">
                  {DEAL_STEPS.map((s, i) => (
                    <li
                      key={s.stage}
                      title={s.hint}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        i < idx && "border-primary/30 bg-primary/5 text-primary",
                        i === idx && "border-primary bg-primary text-primary-foreground",
                        i > idx && "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </li>
                  ))}
                </ol>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy === d.id || idx <= 0} onClick={() => advance(d.id, ORDER[idx - 1])}>
                    <ArrowLeft className="size-4" /> Recuar
                  </Button>
                  <Button size="sm" variant="brand" disabled={busy === d.id || idx >= ORDER.length - 1} onClick={() => advance(d.id, ORDER[idx + 1])}>
                    {busy === d.id ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Avançar
                  </Button>
                  {idx >= ORDER.length - 1 && (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check className="size-4" /> Concluído</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
