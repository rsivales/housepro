"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, Lock, Quote, Trophy, Star, Sparkles, TrendingUp, BadgeCheck,
  Compass, Medal, Lightbulb, Gem, Award, Home, Crosshair, KeyRound, Building2, Landmark,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import {
  prizesFor, earnedPrizes, currentPrize, nextPrize, quoteForLevel,
  type Prize, type PrizeTrack,
} from "@/lib/data/prizes";

const ICONS: Record<string, React.ElementType> = {
  Sparkles, TrendingUp, BadgeCheck, Compass, Medal, Lightbulb, Gem, Award, Trophy, Star,
  Home, Crosshair, KeyRound, Building2, Landmark,
};
function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Star;
  return <C className={className} />;
}

// Valores demo (ligam ao acumulador real quando o Supabase estiver ativo).
const DEMO = { faturacao: 72000, angariacao: 12 };

export default function PremiosPage() {
  const [track, setTrack] = React.useState<PrizeTrack>("faturacao");
  const value = track === "faturacao" ? DEMO.faturacao : DEMO.angariacao;
  const fmt = (n: number) => (track === "faturacao" ? formatEuro(n) : `${n}`);

  const list = prizesFor(track);
  const earned = earnedPrizes(value, track);
  const cur = currentPrize(value, track);
  const { next, progressPct, remaining } = nextPrize(value, track);
  const quote = quoteForLevel(earned.length);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Trophy className="size-7 text-gold" /> Prémios & conquistas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A tua progressão, patamar a patamar. Cada conquista fica registada no teu hall da fama.
        </p>

        {/* Alternador de trilha */}
        <div className="mt-5 inline-flex rounded-lg border p-1">
          {(["faturacao", "angariacao"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrack(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                track === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "faturacao" ? "Faturação" : "Angariação"}
            </button>
          ))}
        </div>

        {/* Prémio atual + progresso */}
        <div className="mt-5 overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground sm:p-8">
            <div className="flex items-center gap-5">
              <PrizeBadge prize={cur} big earned />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                  {cur ? "Patamar atual" : "Ainda sem prémio — falta pouco"}
                </p>
                <p className="font-display text-3xl leading-tight">{cur?.name ?? "Arranque"}</p>
                <p className="mt-1 text-sm text-primary-foreground/85">
                  {cur?.tagline ?? "A tua primeira conquista está ao virar da esquina."}
                </p>
              </div>
            </div>

            {next && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-primary-foreground/85">
                  <span>Próximo: <strong>{next.name}</strong></span>
                  <span>faltam {fmt(remaining)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Frase inspiradora */}
          <div className="flex items-start gap-3 bg-card p-5">
            <Quote className="size-5 shrink-0 text-gold" />
            <p className="font-display text-lg italic leading-snug">{quote}</p>
          </div>
        </div>

        {/* Escada de prémios */}
        <h2 className="mt-8 font-display text-xl">Escada de prémios</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const isEarned = value >= p.threshold;
            const isNext = next?.threshold === p.threshold;
            return (
              <div
                key={p.threshold}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors",
                  isEarned ? "bg-card" : "bg-secondary/30",
                  isNext && "ring-2 ring-gold"
                )}
              >
                <PrizeBadge prize={p} earned={isEarned} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium", !isEarned && "text-muted-foreground")}>{p.name}</p>
                    {isNext && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">a seguir</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{fmt(p.threshold)}</p>
                </div>
                {isEarned ? (
                  <BadgeCheck className="size-5 shrink-0 text-primary" />
                ) : (
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hall da fama — cronologia */}
        <h2 className="mt-10 flex items-center gap-2 font-display text-xl">
          <Star className="size-5 text-gold" /> Hall da fama
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A cronologia das tuas conquistas. Fica para sempre — o reset anual não a apaga.
        </p>
        {earned.length > 0 ? (
          <ol className="mt-5 space-y-0">
            {[...earned].reverse().map((p, i) => {
              const last = i === earned.length - 1;
              return (
                <li key={p.threshold} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <PrizeBadge prize={p} earned small />
                    {!last && <span className="my-1 w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className={cn("pb-6", last && "pb-0")}>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.tagline}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Conquistado ao atingir {fmt(p.threshold)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
            Ainda sem conquistas neste ciclo. A primeira está quase!
          </p>
        )}
      </div>
    </div>
  );
}

function PrizeBadge({ prize, earned, big, small }: { prize?: Prize; earned?: boolean; big?: boolean; small?: boolean }) {
  const size = big ? "size-16" : small ? "size-10" : "size-12";
  const icon = big ? "size-8" : small ? "size-5" : "size-6";
  if (!prize) {
    return <span className={cn("grid shrink-0 place-items-center rounded-full bg-white/15", size)}><Sparkles className={cn(icon, "text-primary-foreground")} /></span>;
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full", size, !earned && "opacity-40 grayscale")}
      style={{ background: earned ? `${prize.color}22` : "var(--secondary)", color: earned ? prize.color : "var(--muted-foreground)", boxShadow: earned ? `inset 0 0 0 2px ${prize.color}` : "inset 0 0 0 1px var(--border)" }}
    >
      {prize.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prize.image} alt={prize.name} className="size-full rounded-full object-cover" />
      ) : (
        <Icon name={prize.icon} className={icon} />
      )}
    </span>
  );
}
