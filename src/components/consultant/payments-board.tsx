"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Coins, PiggyBank, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import {
  ROLE_LABEL, STATUS_LABEL, STATUS_FLOW, payoutTotals,
  type Payout, type PayoutStatus,
} from "@/lib/data/payments";

const ROLE_ICON: Record<string, React.ElementType> = {
  producao: Wallet, override: Coins, royalties: Coins, pensao: PiggyBank,
};

export function PaymentsBoard({ initial, canManage, demo }: { initial: Payout[]; canManage: boolean; demo?: boolean }) {
  const [payouts, setPayouts] = React.useState<Payout[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const t = payoutTotals(payouts);

  async function advance(p: Payout) {
    const idx = STATUS_FLOW.indexOf(p.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1] as PayoutStatus;
    setBusy(p.id);
    setPayouts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next, paidAt: next === "pago" ? new Date().toISOString() : x.paidAt } : x)));
    try {
      await fetch("/api/payments/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, status: next }),
      });
    } catch {/* best-effort — estado local já atualizado */}
    setBusy(null);
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Totais */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card label="Total" value={formatEuro(t.total)} tone="primary" />
        <Card label="Pendente" value={formatEuro(t.pendente)} tone="amber" />
        <Card label="Processado" value={formatEuro(t.processado)} tone="sky" />
        <Card label="Pago" value={formatEuro(t.pago)} tone="primary" />
      </div>

      {/* Fundo de pensão */}
      <Link href="/app/fundo-pensao" className="flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r from-primary/10 to-transparent p-4 transition-colors hover:from-primary/15">
        <span className="flex items-center gap-2.5">
          <PiggyBank className="size-5 text-primary" />
          <span>
            <span className="block text-sm font-medium">{formatEuro(t.pensao)} para o fundo de pensão</span>
            <span className="block text-xs text-muted-foreground">2% de cada negócio — ver o dashboard do fundo</span>
          </span>
        </span>
        <ArrowRight className="size-4 text-muted-foreground" />
      </Link>

      {/* Linhas */}
      <div className="space-y-2.5">
        {payouts.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sem pagamentos ainda.</p>
        )}
        {payouts.map((p) => {
          const Icon = ROLE_ICON[p.role] ?? Wallet;
          const st = STATUS_LABEL[p.status];
          const last = p.status === "pago";
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {ROLE_LABEL[p.role]}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", st.badge)}>{st.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.dealRef} · {p.beneficiaryName}
                  {p.paidAt && ` · pago ${new Date(p.paidAt).toLocaleDateString("pt-PT")}`}
                </p>
              </div>
              <span className="shrink-0 font-display text-lg tabular-nums">{formatEuro(p.amount)}</span>
              {canManage && !last && (
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => advance(p)}>
                  <Check className="size-3.5" /> {p.status === "pendente" ? "Processar" : "Pagar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
        {demo ? "Modo demo: exemplos de pagamentos. " : ""}
        Com o Supabase ligado, cada fecho de negócio cria estas linhas automaticamente e o
        estado sincroniza com a contabilidade. Os 2% alimentam o fundo de pensão do consultor.
      </p>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "primary" | "amber" | "sky" }) {
  const cls = { primary: "text-primary", amber: "text-amber-600 dark:text-amber-400", sky: "text-sky-600 dark:text-sky-400" }[tone];
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className={cn("text-xs font-medium", cls)}>{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums">{value}</p>
    </div>
  );
}
