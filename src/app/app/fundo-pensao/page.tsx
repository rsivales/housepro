"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PiggyBank, Lock, LockOpen, TrendingUp, Gift, Info, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  demoPensionFund,
  totalContributed,
  pensionBalance,
  permanenceStatus,
} from "@/lib/data/pension";

export default function FundoPensaoPage() {
  const fund = demoPensionFund;
  const [beneficiary, setBeneficiary] = React.useState(fund.beneficiary ?? "");
  const [saved, setSaved] = React.useState(false);

  const contrib = totalContributed(fund);
  const balance = pensionBalance(fund);
  const perm = permanenceStatus(fund);
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <PiggyBank className="size-7 text-primary" /> Fundo de pensão
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          2% de cada negócio, retirados antes de qualquer divisão, capitalizados
          para o teu futuro. Rende dividendos e pode ser deixado a quem quiseres.
        </p>

        {/* Saldo */}
        <div className="mt-6 overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground sm:p-8">
            <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Saldo total</p>
            <p className="font-display text-5xl tabular-nums">{formatEuro(balance)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary-foreground/70">Contribuído</p>
                <p className="font-display text-xl tabular-nums">{formatEuro(contrib)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-primary-foreground/70">
                  <TrendingUp className="size-3.5" /> Dividendos ({fund.annualRatePct}%/ano)
                </p>
                <p className="font-display text-xl tabular-nums text-gold">+{formatEuro(fund.dividendsAccrued)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Permanência */}
        <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className={cn("grid size-10 place-items-center rounded-full", perm.unlocked ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
              {perm.unlocked ? <LockOpen className="size-5" /> : <Lock className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {perm.unlocked ? "Disponível para levantamento" : "Em período de permanência"}
              </p>
              <p className="text-sm text-muted-foreground">
                Permanência mínima de {fund.minYears} anos · desbloqueia a {fmtDate(perm.unlockDate)}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${perm.progressPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {perm.yearsElapsed.toFixed(1)} de {fund.minYears} anos cumpridos
          </p>
        </div>

        {/* Beneficiário */}
        <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-medium">
            <Gift className="size-4 text-primary" /> Beneficiário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Podes deixar o fundo a um filho, familiar ou a quem quiseres doar. Editável a qualquer momento.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              value={beneficiary}
              onChange={(e) => { setBeneficiary(e.target.value); setSaved(false); }}
              placeholder="Nome do beneficiário"
              className="min-w-0 flex-1"
            />
            <Button onClick={() => setSaved(true)} disabled={!beneficiary.trim()}>
              {saved ? <><Check className="size-4" /> Guardado</> : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Contribuições */}
        <h2 className="mt-8 font-display text-xl">Contribuições recentes</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Negócio</th>
                <th className="px-4 py-3 text-right font-medium">Contribuição (2%)</th>
              </tr>
            </thead>
            <tbody>
              {fund.contributions.map((c) => (
                <tr key={c.id} className="border-b last:border-none">
                  <td className="px-4 py-3">{fmtDate(c.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.dealRef ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatEuro(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl border bg-secondary/40 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Os 2% são retirados <strong className="text-foreground">antes</strong> da repartição por
            escalão e da rede de afilhados — o teu futuro fica assegurado à cabeça.
          </p>
        </div>
      </div>
    </div>
  );
}
