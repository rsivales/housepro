"use client";

import * as React from "react";
import {
  Filter,
  Home,
  Phone,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
} from "lucide-react";

/**
 * CRM — pipelines em Kanban para a área do consultor.
 * Dois pipelines (angariação e comprador), com movimentação de cartões entre
 * fases (estado local; a persistência por agência chega com o Supabase no M2/M5).
 */

type Deal = {
  id: string;
  cliente: string;
  ref: string;
  titulo: string;
  valor: number;
  dias: number;
  agente: string;
  stage: number;
};

type PipelineKey = "angariacao" | "comprador";

type Pipeline = {
  key: PipelineKey;
  label: string;
  stages: string[];
  deals: Deal[];
};

const euro = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const PIPELINES: Pipeline[] = [
  {
    key: "angariacao",
    label: "Angariação",
    stages: ["Contacto", "Reunião", "Angariado", "Publicado", "Proposta", "Fechado"],
    deals: [
      { id: "a1", cliente: "Família Nunes", ref: "HP-1042", titulo: "T3 · Faro", valor: 320000, dias: 3, agente: "AR", stage: 0 },
      { id: "a2", cliente: "Sr. Oliveira", ref: "HP-1051", titulo: "Moradia · Loulé", valor: 615000, dias: 6, agente: "AR", stage: 1 },
      { id: "a3", cliente: "D. Marta", ref: "HP-1033", titulo: "T2 · Portimão", valor: 245000, dias: 12, agente: "RC", stage: 2 },
      { id: "a4", cliente: "Invest SA", ref: "HP-1060", titulo: "Terreno · Silves", valor: 180000, dias: 2, agente: "AR", stage: 3 },
      { id: "a5", cliente: "Família Costa", ref: "HP-1019", titulo: "T4 · Albufeira", valor: 540000, dias: 20, agente: "RC", stage: 4 },
      { id: "a6", cliente: "Sr. Pinto", ref: "HP-1007", titulo: "T1 · Lagos", valor: 210000, dias: 34, agente: "AR", stage: 5 },
    ],
  },
  {
    key: "comprador",
    label: "Comprador",
    stages: ["Lead", "Qualificado", "Visitas", "Proposta", "Reserva", "Escritura"],
    deals: [
      { id: "c1", cliente: "John & Mary", ref: "HP-1042", titulo: "Procura T3 mar", valor: 350000, dias: 1, agente: "AR", stage: 0 },
      { id: "c2", cliente: "Sr. Almeida", ref: "HP-1051", titulo: "Moradia c/ piscina", valor: 600000, dias: 4, agente: "RC", stage: 1 },
      { id: "c3", cliente: "Dupont", ref: "HP-1019", titulo: "Investimento T2", valor: 250000, dias: 9, agente: "AR", stage: 2 },
      { id: "c4", cliente: "D. Sofia", ref: "HP-1033", titulo: "1ª habitação", valor: 240000, dias: 15, agente: "RC", stage: 3 },
      { id: "c5", cliente: "Família Rocha", ref: "HP-1060", titulo: "Terreno + construção", valor: 190000, dias: 22, agente: "AR", stage: 4 },
    ],
  },
];

const STAGE_ACCENT = [
  "bg-slate-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-orange-400",
  "bg-emerald-500",
];

export default function CrmPage() {
  const [pipe, setPipe] = React.useState<PipelineKey>("angariacao");
  const [deals, setDeals] = React.useState<Record<PipelineKey, Deal[]>>(() => ({
    angariacao: PIPELINES[0].deals,
    comprador: PIPELINES[1].deals,
  }));

  const current = PIPELINES.find((p) => p.key === pipe)!;
  const list = deals[pipe];
  const totalValor = list.reduce((s, d) => s + d.valor, 0);

  function move(id: string, dir: 1 | -1) {
    setDeals((prev) => ({
      ...prev,
      [pipe]: prev[pipe].map((d) =>
        d.id === id
          ? { ...d, stage: Math.min(current.stages.length - 1, Math.max(0, d.stage + dir)) }
          : d
      ),
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Área do consultor</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">CRM · Pipelines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arraste os negócios pelas fases com as setas. Os dados são de exemplo.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]">
          <Plus className="size-4" /> Novo negócio
        </button>
      </div>

      {/* Alternador de pipeline + resumo */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border bg-card p-1 shadow-sm">
          {PIPELINES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPipe(p.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                pipe === p.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="size-3.5" /> {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Negócios</p>
            <p className="font-display text-xl leading-none">{list.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Valor em pipeline</p>
              <p className="font-display text-xl leading-none">{euro(totalValor)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quadro Kanban */}
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {current.stages.map((stage, i) => {
          const cards = list.filter((d) => d.stage === i);
          const soma = cards.reduce((s, d) => s + d.valor, 0);
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${STAGE_ACCENT[i] ?? "bg-slate-400"}`} />
                  <span className="text-sm font-semibold">{stage}</span>
                  <span className="text-xs text-muted-foreground">({cards.length})</span>
                </div>
                <span className="text-xs text-muted-foreground">{euro(soma)}</span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {cards.map((d) => (
                  <div
                    key={d.id}
                    className="group rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{d.cliente}</p>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {d.agente}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Home className="size-3.5" /> {d.titulo}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-base">{euro(d.valor)}</span>
                      <span className="text-[11px] text-muted-foreground">Ref. {d.ref}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t pt-2">
                      <span className="text-[11px] text-muted-foreground">há {d.dias} dias</span>
                      <div className="flex items-center gap-1">
                        <a
                          href="#"
                          aria-label="Contactar"
                          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <button
                          onClick={() => move(d.id, -1)}
                          disabled={d.stage === 0}
                          aria-label="Recuar fase"
                          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          onClick={() => move(d.id, 1)}
                          disabled={d.stage === current.stages.length - 1}
                          aria-label="Avançar fase"
                          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Sem negócios
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
