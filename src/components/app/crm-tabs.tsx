"use client";

import * as React from "react";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { CrmBoard } from "@/components/app/crm-board";
import { LeadsBoard, type LeadCard } from "@/components/app/leads-board";
import { LEAD_PIPELINES, leadPipeline } from "@/lib/data/lead-pipelines";
import type { DealListItem } from "@/lib/db/deals";

/** CRM com pipelines SEPARADOS: Negócios (transação) e Leads (compradores /
 *  proprietários). As leads que entram classificam-se no seu próprio pipeline,
 *  sem se misturarem com os negócios. */
export function CrmTabs({ deals, leads }: { deals: DealListItem[]; leads: LeadCard[] }) {
  const [tab, setTab] = React.useState<string>("negocios");

  const tabs = [
    { key: "negocios", label: "Negócios" },
    ...LEAD_PIPELINES.map((p) => ({ key: p.key, label: `Leads · ${p.label}` })),
  ];

  return (
    <div>
      {/* Alternador de pipelines */}
      <div className="inline-flex flex-wrap gap-1 rounded-full border bg-card p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "negocios" ? (
          <CrmBoard initial={deals} />
        ) : (
          <div>
            <p className="text-sm font-medium text-primary">Área do consultor</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">CRM · Leads · {leadPipeline(tab).label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              As leads que entram do site/portais aparecem aqui. Classifique-as pelo pipeline e mova-as pelas fases.
            </p>
            <LeadsBoard pipeline={leadPipeline(tab)} leads={leads} />
          </div>
        )}
      </div>
    </div>
  );
}
