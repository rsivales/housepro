"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, Info, Network, Phone, UserPlus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { afilhadoStats, type AfilhadoNode } from "@/lib/data/afilhados";
import { DEFAULT_SPLIT, maxOverrideDepth } from "@/lib/commission/split";

const LEVEL_COLORS = ["bg-primary", "bg-gold", "bg-sky-500", "bg-violet-500"];

function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function EquipaView({ root }: { root: AfilhadoNode }) {
  const stats = afilhadoStats(root);
  const maxDepth = maxOverrideDepth();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl">
              <Network className="size-7 text-primary" /> A minha equipa
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Os consultores que apadrinhou e a sua rede. Recebe uma percentagem
              da faturação deles, por nível — uma segunda fonte de receita que
              cresce com a equipa.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() =>
              alert(
                "Apadrinhar novo consultor: em breve — envia o convite por email/telemóvel e ele entra na tua árvore ao registar-se."
              )
            }
          >
            <UserPlus className="size-4" /> Apadrinhar consultor
          </button>
        </div>

        {/* Resumo de ganhos */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Override estimado / mês"
            value={formatEuro(stats.estimatedMonthly)}
            highlight
          />
          <Stat label="Afilhados na rede" value={String(stats.total)} sub={`${stats.ativos} a faturar`} />
          <Stat label="Níveis com override" value={`${maxDepth}`} sub={DEFAULT_SPLIT.overrideTiers.map((p) => `${p}%`).join(" · ")} />
        </div>

        {/* Repartição por nível */}
        <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Override por nível (este mês)
          </h2>
          <div className="mt-3 space-y-2.5">
            {stats.byLevel.map((l, i) => (
              <div key={l.level} className="flex items-center gap-3 text-sm">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-white", LEVEL_COLORS[i % LEVEL_COLORS.length])}>
                  {l.level}
                </span>
                <span className="w-24 shrink-0 text-muted-foreground">
                  Nível {l.level} · {l.pct}%
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", LEVEL_COLORS[i % LEVEL_COLORS.length])}
                    style={{
                      width: `${stats.estimatedMonthly > 0 ? (l.override / stats.estimatedMonthly) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums">{l.count} pes.</span>
                <span className="w-24 shrink-0 text-right font-medium tabular-nums">
                  {formatEuro(l.override)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notificações */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border bg-secondary/40 p-4 text-sm">
          <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Recebe uma <strong className="text-foreground">notificação automática</strong>{" "}
            sempre que um afilhado gera comissão, com o valor estimado a receber já
            calculado pelo nível.
          </p>
        </div>

        {/* Árvore */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-xl">
          <Users className="size-5 text-primary" /> Ramificação da rede
        </h2>
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <TreeNode node={root} level={0} maxDepth={maxDepth} isRoot />
        </div>

        {/* Como funciona */}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Como funciona o override</p>
            <p className="mt-1">
              Da comissão bruta de cada agente retiram-se {DEFAULT_SPLIT.royaltiesPct}%
              (marca), {DEFAULT_SPLIT.agencyPct}% (agência) e {DEFAULT_SPLIT.retirementPct}%
              (fundo de reforma). Até {DEFAULT_SPLIT.overrideTiers.reduce((a, b) => a + b, 0)}%
              distribuem-se pelos padrinhos por nível ({DEFAULT_SPLIT.overrideTiers.map((p) => `${p}%`).join(" · ")});
              o restante fica para o agente que fez o negócio. Um nível sem padrinho
              não é pago — essa parte volta para o agente produtor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", highlight ? "bg-primary text-primary-foreground" : "bg-card")}>
      <p className={cn("text-xs font-medium uppercase tracking-wide", highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
      {sub && <p className={cn("mt-0.5 text-xs", highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>{sub}</p>}
    </div>
  );
}

/** Nó recursivo da árvore (org-chart vertical, com conectores). */
function TreeNode({
  node,
  level,
  maxDepth,
  isRoot,
}: {
  node: AfilhadoNode;
  level: number;
  maxDepth: number;
  isRoot?: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  const hasKids = node.children.length > 0;
  const overridePct = level >= 1 ? DEFAULT_SPLIT.overrideTiers[level - 1] ?? 0 : 0;
  const beyond = level > maxDepth;
  const override = !isRoot && node.active && overridePct > 0 ? (node.monthlyGross * overridePct) / 100 : 0;
  const color = LEVEL_COLORS[(level - 1 + LEVEL_COLORS.length) % LEVEL_COLORS.length];

  return (
    <div className={cn(!isRoot && "border-l border-dashed pl-4 sm:pl-6")}>
      <div className="flex items-center gap-3 py-2">
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-6 shrink-0 place-items-center rounded-md border text-muted-foreground hover:bg-secondary"
            aria-label={open ? "Fechar" : "Abrir"}
          >
            <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white",
            isRoot ? "bg-foreground" : color,
            !node.active && "opacity-50"
          )}
        >
          {initials(node.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium">{node.name}</span>
            {!isRoot && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium text-white", color)}>
                Nível {level} · {overridePct}%
              </span>
            )}
            {!isRoot && !node.active && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                ainda não fatura
              </span>
            )}
            {beyond && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                sem override (além do nível {maxDepth})
              </span>
            )}
          </div>
          {!isRoot && node.contact && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" /> {node.contact}
            </p>
          )}
        </div>

        {!isRoot && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">fatura {formatEuro(node.monthlyGross)}</p>
            <p className={cn("font-display tabular-nums", override > 0 ? "text-primary" : "text-muted-foreground")}>
              {override > 0 ? `+${formatEuro(override)}` : "—"}
            </p>
          </div>
        )}
      </div>

      {hasKids && open && (
        <div className={cn(isRoot ? "" : "ml-3")}>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} level={level + 1} maxDepth={maxDepth} />
          ))}
        </div>
      )}
    </div>
  );
}
