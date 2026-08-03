"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, Info, Network, Phone, UserPlus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { afilhadoStats, flattenAfilhados, type AfilhadoNode } from "@/lib/data/afilhados";
import { DEFAULT_SPLIT, maxOverrideDepth } from "@/lib/commission/split";
import { effectiveCommission } from "@/lib/data/commission";
import type { OverridePayout } from "@/lib/commission/override-chain";
import type { Notification } from "@/lib/db/repo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Handshake } from "lucide-react";

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

export function EquipaView({
  root,
  meId,
  notifications = [],
}: {
  root: AfilhadoNode;
  meId?: string;
  notifications?: Notification[];
}) {
  const stats = afilhadoStats(root);
  const maxDepth = maxOverrideDepth();
  const [view, setView] = React.useState<"arvore" | "piramide">("arvore");

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

        {/* Notificações (inbox real de override) */}
        <NotificationsInbox notifications={notifications} />

        {/* Fecho de negócio → override + notificações */}
        <CloseDealPanel root={root} meId={meId} />

        {/* Rede — árvore ou pirâmide */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <Users className="size-5 text-primary" /> Ramificação da rede
          </h2>
          <div className="inline-flex rounded-lg border p-1">
            {(["arvore", "piramide"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "arvore" ? "Árvore" : "Pirâmide"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          {view === "arvore" ? (
            <TreeNode node={root} level={0} maxDepth={maxDepth} isRoot />
          ) : (
            <PyramidView root={root} maxDepth={maxDepth} />
          )}
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

/** Inbox de notificações (override de rede, etc.). */
function NotificationsInbox({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border bg-secondary/40 p-4 text-sm">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Recebe uma <strong className="text-foreground">notificação automática</strong>{" "}
          sempre que um afilhado gera comissão, com o valor estimado a receber já
          calculado pelo nível. As suas notificações aparecem aqui.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Bell className="size-4 text-primary" /> Notificações
      </h2>
      <ul className="mt-3 space-y-2.5">
        {notifications.map((n) => (
          <li key={n.id} className="flex items-start gap-3 rounded-xl border p-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Handshake className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Painel para registar o fecho de um negócio e distribuir o override. */
function CloseDealPanel({ root, meId }: { root: AfilhadoNode; meId?: string }) {
  const membros = React.useMemo(() => flattenAfilhados(root), [root]);
  const [producerId, setProducerId] = React.useState(membros[0]?.id ?? "");
  const [amount, setAmount] = React.useState(300000);
  const [pct, setPct] = React.useState(5);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<
    | {
        gross: number;
        payouts: OverridePayout[];
        overrideTotal: number;
        producerNet: number;
        producerNetPct: number;
        notified?: number;
      }
    | null
  >(null);

  const grossPreview = effectiveCommission(amount, { commissionType: "percent", commissionPct: pct }).amount;
  const producer = membros.find((m) => m.id === producerId);

  async function fechar() {
    if (!producerId || amount <= 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/deals/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          producerId,
          producerName: producer?.name,
          amount,
          commissionPct: pct,
        }),
      });
      const out = await res.json();
      if (res.ok && out.ok) setResult(out);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Handshake className="size-4 text-primary" /> Registar fecho de negócio
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ao fechar (escritura), a comissão entra na faturação do consultor e o
        override é distribuído pela cadeia de padrinhos, com notificação a cada um.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Quem fechou</Label>
          <select
            value={producerId}
            onChange={(e) => setProducerId(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (nível {m.level})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor do negócio (€)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>Comissão (%)</Label>
          <Input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={fechar} disabled={loading}>
          {loading ? "A processar…" : "Fechar e distribuir"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Comissão bruta: <strong className="text-foreground">{formatEuro(grossPreview)}</strong>
        </span>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border bg-secondary/30 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" /> Negócio fechado — {result.notified ?? result.payouts.filter((p) => p.amount > 0).length} notificação(ões) enviada(s)
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <Row2 label={`Comissão bruta`} value={formatEuro(result.gross)} />
            <Row2 label={`Produtor (${producer?.name ?? ""}) — ${result.producerNetPct}%`} value={formatEuro(result.producerNet)} />
            {result.payouts.filter((p) => p.amount > 0).map((p) => (
              <Row2
                key={p.level}
                label={`Nível ${p.level} · ${p.agentName ?? p.agentId} · ${p.pct}%`}
                value={`+${formatEuro(p.amount)}`}
                highlight={p.agentId === meId}
              />
            ))}
          </div>
          {result.overrideTotal === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Este consultor não tem padrinhos acima — não há override a distribuir.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row2({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-md px-2 py-1", highlight && "bg-primary/10")}>
      <span className={cn(highlight ? "font-medium text-primary" : "text-muted-foreground")}>
        {highlight ? "Você · " : ""}
        {label}
      </span>
      <span className="font-display tabular-nums">{value}</span>
    </div>
  );
}

/** Vista em pirâmide/genealogia: níveis empilhados, cada linha uma geração. */
function PyramidView({ root, maxDepth }: { root: AfilhadoNode; maxDepth: number }) {
  // Agrupa os nós por nível (0 = raiz).
  const levels: AfilhadoNode[][] = [];
  let frontier: AfilhadoNode[] = [root];
  while (frontier.length) {
    levels.push(frontier);
    frontier = frontier.flatMap((n) => n.children);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max flex-col items-stretch gap-5 py-2">
        {levels.map((row, level) => {
          const pct = level >= 1 ? DEFAULT_SPLIT.overrideTiers[level - 1] ?? 0 : 0;
          const beyond = level > maxDepth;
          const color = level === 0 ? "bg-foreground" : LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];
          return (
            <div key={level} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {level === 0 ? (
                  <span>Tu · padrinho</span>
                ) : (
                  <span className={cn("rounded-full px-2 py-0.5 text-white", beyond ? "bg-muted-foreground" : color)}>
                    Nível {level} · {beyond ? "sem override" : `${pct}%`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {row.map((node) => {
                  const override = level >= 1 && node.active && pct > 0 ? (node.monthlyGross * pct) / 100 : 0;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        "flex min-w-[128px] items-center gap-2 rounded-xl border px-3 py-2",
                        level === 0 ? "border-foreground/30 bg-secondary/40" : "bg-card",
                        !node.active && level >= 1 && "opacity-60"
                      )}
                    >
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white", color)}>
                        {initials(node.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">{node.name}</p>
                        {level >= 1 && (
                          <p className={cn("text-xs tabular-nums", override > 0 ? "text-primary" : "text-muted-foreground")}>
                            {override > 0 ? `+${formatEuro(override)}` : node.active ? "—" : "não fatura"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {level < levels.length - 1 && <div className="h-4 w-px bg-border" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
