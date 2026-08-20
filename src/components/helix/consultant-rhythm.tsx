"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, TrendingUp, AlertTriangle } from "lucide-react";

import { KpiDonut, Sparkline } from "./helix-primitives";

export interface RhythmData {
  sla: number; // %
  slaTrend: string;
  visits: number;
  visitsTrend: string;
  proposals: number;
  proposalsTrend: string;
  properties: number;
  propertiesNoContact: number;
  spark: number[];
}

const FILTERS = [
  { key: "week", label: "Esta semana" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "quarter", label: "Trimestre" },
] as const;

/** "O meu ritmo" — 4 KPIs compactos com donuts e tendências. */
export function ConsultantRhythm({ data }: { data: RhythmData }) {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["key"]>("week");
  const [open, setOpen] = React.useState(false);
  const filterLabel = FILTERS.find((f) => f.key === filter)!.label;

  return (
    <section className="hx-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="hx-section-title text-lg">O meu ritmo</h2>
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm hx-muted">
            {filterLabel} <ChevronDown className="size-4" />
          </button>
          {open && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--hx-border)] bg-[var(--hx-surface)] shadow-lg">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => { setFilter(f.key); setOpen(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--hx-surface-blue)]">
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi donut={<KpiDonut value={data.sla} tone="blue" centerLabel={<Center label="SLA" value={`${data.sla}%`} />} />} trend={`↑ ${data.slaTrend}`} spark={data.spark} />
        <Kpi donut={<KpiDonut value={data.visits} max={Math.max(10, data.visits)} tone="blue" centerLabel={<Center label="Visitas" value={String(data.visits)} />} />} trend={`↑ ${data.visitsTrend}`} spark={data.spark} />
        <Kpi donut={<KpiDonut value={data.proposals} max={Math.max(5, data.proposals)} tone="blue" centerLabel={<Center label="Propostas" value={String(data.proposals)} />} />} trend={`↑ ${data.proposalsTrend}`} spark={data.spark} />
        <Kpi
          donut={<KpiDonut value={data.properties} max={Math.max(15, data.properties)} tone="navy" centerLabel={<Center label="Imóveis" value={String(data.properties)} />} />}
          alert={data.propertiesNoContact > 0 ? `${data.propertiesNoContact} sem contactos` : undefined}
          spark={data.spark}
        />
      </div>
    </section>
  );
}

function Center({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[0.62rem] font-medium hx-muted">{label}</span>
      <span className="hx-tnum text-lg font-bold leading-none" style={{ color: "var(--hx-navy)" }}>{value}</span>
    </>
  );
}

function Kpi({ donut, trend, alert, spark }: { donut: React.ReactNode; trend?: string; alert?: string; spark: number[] }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {donut}
      {alert ? (
        <Link href="/app/desempenho" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--hx-warn)" }}>
          <AlertTriangle className="size-3" /> {alert}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--hx-success)" }}>
          <TrendingUp className="size-3" /> {trend}
        </span>
      )}
      <Sparkline points={spark} width={110} height={22} />
    </div>
  );
}
