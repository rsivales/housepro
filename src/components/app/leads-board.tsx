"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Home, Loader2, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { LEAD_PIPELINES, type LeadPipeline } from "@/lib/data/lead-pipelines";

export interface LeadCard {
  id: string;
  name: string;
  contact: string;
  propertyId?: string;
  propertyRef?: string;
  pipeline?: string;
  stage?: number;
  source?: string;
}

const ACCENT = ["bg-slate-400", "bg-sky-400", "bg-violet-400", "bg-amber-400", "bg-orange-400", "bg-emerald-500"];

/** Kanban de LEADS de um pipeline (compradores/proprietários). Separado dos
 *  negócios: as leads entram e classificam-se aqui, com fases próprias. */
export function LeadsBoard({ pipeline, leads }: { pipeline: LeadPipeline; leads: LeadCard[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  // Leads deste pipeline; as por classificar (sem pipeline) caem no 1.º pipeline.
  const isDefault = pipeline.key === LEAD_PIPELINES[0].key;
  const mine = leads.filter((l) => l.pipeline === pipeline.key || (isDefault && !l.pipeline));

  async function post(leadId: string, stage: number, pipe?: string) {
    setBusy(leadId);
    try {
      const res = await fetch("/api/leads/stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, stage, pipeline: pipe ?? pipeline.key }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
      {pipeline.stages.map((label, i) => {
        const cards = mine.filter((l) => (l.stage ?? 0) === i);
        return (
          <div key={label} className="w-72 shrink-0">
            <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", ACCENT[i] ?? "bg-slate-400")} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">({cards.length})</span>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {cards.map((l) => (
                <div key={l.id} className="rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{l.name}</p>
                    {l.source && (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{l.source}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.contact}</p>
                  {l.propertyRef && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Home className="size-3.5" />
                      {l.propertyId ? (
                        <Link href={`/imovel/${l.propertyId}`} className="text-primary hover:underline">{l.propertyRef}</Link>
                      ) : l.propertyRef}
                    </p>
                  )}

                  {/* Classificar noutro pipeline */}
                  <div className="mt-2">
                    <select
                      value={l.pipeline ?? (isDefault ? pipeline.key : "")}
                      onChange={(e) => post(l.id, 0, e.target.value)}
                      aria-label="Classificar pipeline"
                      className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring"
                    >
                      {LEAD_PIPELINES.map((p) => (
                        <option key={p.key} value={p.key}>Pipeline: {p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2">
                    {busy === l.id && <Loader2 className="mr-auto size-3.5 animate-spin text-muted-foreground" />}
                    <a href={`tel:${l.contact.replace(/\s/g, "")}`} aria-label="Contactar" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Phone className="size-3.5" />
                    </a>
                    <button onClick={() => post(l.id, i - 1)} disabled={i === 0 || busy === l.id} aria-label="Recuar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button onClick={() => post(l.id, i + 1)} disabled={i === pipeline.stages.length - 1 || busy === l.id} aria-label="Avançar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">Sem leads</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
