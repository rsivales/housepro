"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, Lock, Quote, Trophy, Star, Sparkles, TrendingUp, BadgeCheck,
  Compass, Medal, Lightbulb, Gem, Award, Home, Crosshair, KeyRound, Building2,
  Landmark, Target, CalendarClock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import {
  prizesFor, earnedPrizes, currentPrize, nextPrize, quoteForLevel,
  type Prize, type PrizeTrack,
} from "@/lib/data/prizes";
import { readPrizeArt, type PrizeArtMap } from "@/lib/data/prize-art";

const ICONS: Record<string, React.ElementType> = {
  Sparkles, TrendingUp, BadgeCheck, Compass, Medal, Lightbulb, Gem, Award, Trophy, Star,
  Home, Crosshair, KeyRound, Building2, Landmark,
};

// Valores demo (ligam ao acumulador real com o Supabase).
const DEMO = { faturacao: 72000, angariacao: 12, pontos: 1240, nivel: "Ouro" };
const metas = [
  { icon: Home, label: "Angariações (mês)", atual: 3, alvo: 5 },
  { icon: TrendingUp, label: "Fechos (trimestre)", atual: 2, alvo: 4 },
  { icon: CalendarClock, label: "Visitas (mês)", atual: 7, alvo: 10 },
  { icon: Target, label: "Avaliações (mês)", atual: 4, alvo: 6 },
];
const ranking = [
  { nome: "Ana Marques", pts: 1980 },
  { nome: "Rui Tavares", pts: 1610 },
  { nome: "Você", pts: 1240, eu: true },
  { nome: "Sofia Nunes", pts: 1120 },
  { nome: "Carla Dias", pts: 940 },
];

export default function PremiosPage() {
  const [track, setTrack] = React.useState<PrizeTrack>("faturacao");
  const [art, setArt] = React.useState<PrizeArtMap>({});
  React.useEffect(() => {
    setArt(readPrizeArt());
    // Artes globais (Supabase) têm prioridade — as que todos veem.
    fetch("/api/brand/prize-art")
      .then((r) => r.json())
      .then((d) => { if (d?.art) setArt((prev) => ({ ...prev, ...d.art })); })
      .catch(() => {});
  }, []);

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
          <Trophy className="size-7 text-gold" /> Objetivos &amp; Prémios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As tuas metas, pontos e conquistas — tudo num só lugar.
        </p>

        {/* ── OBJETIVOS DO CICLO ─────────────────────────────── */}
        <section className="mt-6 grid gap-4 sm:grid-cols-[1fr_11rem]">
          <div className="grid gap-3 sm:grid-cols-2">
            {metas.map((m) => {
              const pct = Math.min(100, Math.round((m.atual / m.alvo) * 100));
              return (
                <div key={m.label} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <m.icon className="size-4 text-primary" /> {m.label}
                  </p>
                  <p className="mt-1 font-display text-2xl tabular-nums">
                    {m.atual}<span className="text-base text-muted-foreground">/{m.alvo}</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col justify-center rounded-2xl border bg-secondary/40 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pontos · nível</p>
            <p className="font-display text-3xl tabular-nums">{DEMO.pontos.toLocaleString("pt-PT")}</p>
            <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-sm font-medium text-gold">
              <Medal className="size-4" /> {DEMO.nivel}
            </p>
          </div>
        </section>

        {/* Alternador de trilha */}
        <div className="mt-8 inline-flex rounded-lg border p-1">
          {(["faturacao", "angariacao"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrack(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                track === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "faturacao" ? "Faturação" : "Angariação"}
            </button>
          ))}
        </div>

        {/* ── PRÉMIO ATUAL (hero premium, escuro) ────────────── */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 shadow-xl">
          <div className="relative p-6 text-[#f3ead2] sm:p-8"
               style={{ background: "radial-gradient(120% 120% at 70% -10%, #2a2620 0%, #14120e 55%, #0c0b09 100%)" }}>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <PrizeMedal prize={cur} art={cur ? art[cur.name] : undefined} earned big />
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-[#c9a13b]">
                  {cur ? "Patamar atual" : "A caminho do primeiro prémio"}
                </p>
                <p className="font-display text-4xl leading-tight" style={{ color: "#e9d9a8" }}>{cur?.name ?? "Arranque"}</p>
                <p className="mt-1.5 text-sm text-[#c8bfa6]">{cur?.tagline ?? "A tua primeira conquista está ao virar da esquina."}</p>
              </div>
            </div>

            {next && (
              <div className="mt-7">
                <div className="flex items-center justify-between text-sm text-[#c8bfa6]">
                  <span>Próximo: <strong className="text-[#e9d9a8]">{next.name}</strong></span>
                  <span>faltam {fmt(remaining)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#c9a13b,#f0d67e)" }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 bg-card p-5">
            <Quote className="size-5 shrink-0 text-gold" />
            <p className="font-display text-lg italic leading-snug">{quote}</p>
          </div>
        </div>

        {/* ── ESCADA DE PRÉMIOS ──────────────────────────────── */}
        <h2 className="mt-8 font-display text-xl">Escada de prémios</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const isEarned = value >= p.threshold;
            const isNext = next?.threshold === p.threshold;
            return (
              <div
                key={p.threshold}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition-colors",
                  isEarned ? "bg-card" : "bg-secondary/30",
                  isNext && "ring-2 ring-gold"
                )}
              >
                <PrizeMedal prize={p} art={art[p.name]} earned={isEarned} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium", !isEarned && "text-muted-foreground")}>{p.name}</p>
                    {isNext && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">a seguir</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{fmt(p.threshold)}</p>
                </div>
                {isEarned ? <BadgeCheck className="size-5 shrink-0 text-primary" /> : <Lock className="size-4 shrink-0 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* ── HALL DA FAMA ───────────────────────────────────── */}
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
                    <PrizeMedal prize={p} art={art[p.name]} earned small />
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

        {/* ── RANKING ────────────────────────────────────────── */}
        <h2 className="mt-10 font-display text-xl">Ranking da agência</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
          {ranking.map((r, i) => (
            <div key={r.nome} className={cn("flex items-center gap-3 px-4 py-3", i < ranking.length - 1 && "border-b", r.eu && "bg-primary/5")}>
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", i === 0 ? "bg-gold text-black" : "bg-secondary text-muted-foreground")}>{i + 1}</span>
              <span className={cn("flex-1 text-sm", r.eu && "font-medium text-primary")}>{r.nome}</span>
              <span className="font-display tabular-nums">{r.pts.toLocaleString("pt-PT")}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-xl border bg-secondary/40 p-4 text-xs text-muted-foreground">
          As artes dos prémios são carregáveis pela marca em{" "}
          <Link href="/admin/premios" className="text-primary hover:underline">/admin/premios</Link>{" "}
          — carrega os teus troféus dedicados e aparecem aqui e na montra pública.
        </p>
      </div>
    </div>
  );
}

/** Medalha do prémio — arte carregada (render) ou medalha dourada premium. */
function PrizeMedal({ prize, art, earned, big, small }: { prize?: Prize; art?: string; earned?: boolean; big?: boolean; small?: boolean }) {
  const dim = big ? 96 : small ? 40 : 52;
  const src = art ?? prize?.image;

  if (src) {
    return (
      <span
        className={cn("block shrink-0 overflow-hidden rounded-2xl border", !earned && "opacity-40 grayscale")}
        style={{ width: dim, height: dim, borderColor: "#c9a13b55", background: "#111" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={prize?.name ?? ""} className="size-full object-cover" />
      </span>
    );
  }

  const C = prize ? ICONS[prize.icon] ?? Star : Sparkles;
  const iconSize = big ? 40 : small ? 18 : 24;
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center rounded-full", !earned && "opacity-45 grayscale")}
      style={{
        width: dim, height: dim,
        background: earned
          ? "radial-gradient(circle at 32% 26%, #f7ecc3 0%, #d9b452 42%, #a5822f 72%, #6f571c 100%)"
          : "radial-gradient(circle at 32% 26%, #d8d5cc, #a6a29a 70%)",
        boxShadow: earned
          ? "inset 0 2px 5px rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25)"
          : "inset 0 1px 3px rgba(0,0,0,.2)",
      }}
    >
      <span className="absolute inset-[10%] rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,.12)" }} />
      <C style={{ width: iconSize, height: iconSize, color: earned ? "#4a3a12" : "#6b6862" }} />
    </span>
  );
}
