"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Phone, Flame, UserRound } from "lucide-react";

import type { Lead } from "@/lib/data/leads";
import { META_PIPELINES, type MetaPipelineKey } from "@/lib/data/meta";
import { scoreBand } from "@/lib/meta/scoring";

/**
 * Kanban das leads Meta por pipeline (Compradores, Proprietários, Recrutamento).
 * Alimentado por dados reais (mock/Supabase). Mover um cartão persiste a etapa
 * em /api/leads/stage (best-effort em demo). O pipeline de Recrutamento fica
 * separado dos comerciais — é só mais um separador.
 */
export function LeadKanban({
  leadsByPipeline,
  agentNames,
}: {
  leadsByPipeline: Record<string, Lead[]>;
  agentNames: Record<string, string>;
}) {
  const [pipe, setPipe] = React.useState<MetaPipelineKey>("compradores");
  const [leads, setLeads] = React.useState<Record<string, Lead[]>>(leadsByPipeline);

  const current = META_PIPELINES.find((p) => p.key === pipe)!;
  const list = leads[pipe] ?? [];

  function move(id: string, dir: 1 | -1) {
    setLeads((prev) => {
      const updated = (prev[pipe] ?? []).map((l) =>
        l.id === id
          ? { ...l, stage: Math.min(current.stages.length - 1, Math.max(0, (l.stage ?? 0) + dir)) }
          : l
      );
      const moved = updated.find((l) => l.id === id);
      if (moved) {
        void fetch("/api/leads/stage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ leadId: id, stage: moved.stage, pipeline: pipe }),
        }).catch(() => {});
      }
      return { ...prev, [pipe]: updated };
    });
  }

  return (
    <div>
      {/* Separadores de pipeline */}
      <div className="inline-flex flex-wrap rounded-full border bg-card p-1 shadow-sm">
        {META_PIPELINES.map((p) => (
          <button
            key={p.key}
            onClick={() => setPipe(p.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              pipe === p.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
            <span className="ml-1.5 text-xs opacity-70">
              ({(leads[p.key] ?? []).length})
            </span>
          </button>
        ))}
      </div>

      {/* Colunas */}
      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {current.stages.map((stage, i) => {
          const cards = list.filter((l) => (l.stage ?? 0) === i);
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                <span className="text-sm font-semibold">{stage}</span>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {cards.map((lead) => {
                  const band = scoreBand(lead.score ?? 0);
                  const who = lead.assignedAgentId
                    ? agentNames[lead.assignedAgentId] ?? "Consultor"
                    : "Sem responsável";
                  return (
                    <div
                      key={lead.id}
                      className="rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{lead.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${band.badge}`}>
                          <Flame className="size-2.5" /> {lead.score ?? 0}
                        </span>
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRound className="size-3.5" /> {who}
                      </p>
                      {(lead.zone || lead.budget) && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {[lead.zone, lead.budget].filter(Boolean).join(" · ")}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t pt-2">
                        {lead.contact ? (
                          <a
                            href={`tel:${lead.contact}`}
                            aria-label="Contactar"
                            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Phone className="size-3.5" />
                          </a>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => move(lead.id, -1)}
                            disabled={(lead.stage ?? 0) === 0}
                            aria-label="Recuar fase"
                            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          <button
                            onClick={() => move(lead.id, 1)}
                            disabled={(lead.stage ?? 0) === current.stages.length - 1}
                            aria-label="Avançar fase"
                            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Sem leads
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
