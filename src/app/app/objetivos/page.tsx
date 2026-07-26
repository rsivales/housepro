import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Star,
  Target,
  TrendingUp,
  Home,
  CalendarClock,
  Award,
  Medal,
  Flame,
  Crown,
  Lock,
  Check,
} from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { AgentAvatar } from "@/components/brand/agent-avatar";

export const metadata: Metadata = { title: "Objetivos & Prémios" };

const NIVEIS = ["Bronze", "Prata", "Ouro", "Platina", "Diamante"];

const metas = [
  { icon: Home, label: "Angariações (mês)", atual: 3, alvo: 5 },
  { icon: TrendingUp, label: "Fechos (trimestre)", atual: 2, alvo: 4 },
  { icon: CalendarClock, label: "Visitas (mês)", atual: 7, alvo: 10 },
  { icon: Target, label: "Avaliações (mês)", atual: 4, alvo: 6 },
];

const badges = [
  { icon: Flame, label: "Em chamas", desc: "3 angariações numa semana", earned: true },
  { icon: Medal, label: "Primeiro fecho", desc: "Fechou o 1.º negócio", earned: true },
  { icon: Star, label: "5 estrelas", desc: "Avaliação máxima de um cliente", earned: true },
  { icon: Award, label: "Top do mês", desc: "1.º lugar mensal da agência", earned: false },
  { icon: Crown, label: "Rei da angariação", desc: "10 angariações num mês", earned: false },
  { icon: Trophy, label: "Centena", desc: "100 negócios fechados", earned: false },
];

const ranking = [
  { nome: "Ana Marques", pts: 1980 },
  { nome: "Rui Tavares", pts: 1610 },
  { nome: "Você", pts: 1240, eu: true },
  { nome: "Sofia Nunes", pts: 1120 },
  { nome: "Carla Dias", pts: 940 },
];

export default async function ObjetivosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const pontos = 1240;
  const nivelIdx = 2;
  const pontosNivel = 1000;
  const pontosProx = 1500;
  const pctNivel = Math.round(
    ((pontos - pontosNivel) / (pontosProx - pontosNivel)) * 100
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Área profissional
          </Link>
          <div className="flex items-center gap-2">
            <AgentAvatar agent={agent} className="size-8" />
            <span className="text-sm font-medium">{agent.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm font-medium text-primary">Gamificação</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">
          Objetivos &amp; Prémios
        </h1>

        {/* Nível + pontos */}
        <div className="mt-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
                <Trophy className="size-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Nível {nivelIdx + 1}</p>
                <p className="font-display text-2xl">
                  Consultor {NIVEIS[nivelIdx]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 font-display text-2xl">
                <Star className="size-5 fill-current" />{" "}
                {pontos.toLocaleString("pt-PT")}
              </p>
              <p className="text-sm opacity-80">pontos</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs opacity-90">
              <span>{NIVEIS[nivelIdx]}</span>
              <span>
                {NIVEIS[nivelIdx + 1]} · faltam {pontosProx - pontos} pts
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${pctNivel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metas */}
        <h2 className="mt-10 font-display text-xl">As minhas metas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {metas.map((m) => {
            const pct = Math.min(100, Math.round((m.atual / m.alvo) * 100));
            const done = m.atual >= m.alvo;
            return (
              <div key={m.label} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                      <m.icon className="size-4.5" />
                    </div>
                    <span className="font-medium">{m.label}</span>
                  </div>
                  <span
                    className={
                      done
                        ? "text-sm font-semibold text-primary"
                        : "text-sm font-semibold"
                    }
                  >
                    {m.atual}/{m.alvo}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Distintivos */}
        <h2 className="mt-10 font-display text-xl">Distintivos</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.label}
              className={
                "relative rounded-2xl border p-5 text-center shadow-sm " +
                (b.earned ? "bg-card" : "bg-secondary/40 opacity-70")
              }
            >
              <div
                className={
                  "mx-auto grid size-12 place-items-center rounded-full " +
                  (b.earned
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground")
                }
              >
                {b.earned ? <b.icon className="size-6" /> : <Lock className="size-5" />}
              </div>
              <p className="mt-3 font-medium">{b.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
              {b.earned && (
                <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Ranking */}
        <h2 className="mt-10 font-display text-xl">Ranking da agência (mês)</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
          {ranking.map((r, i) => (
            <div
              key={r.nome}
              className={
                "flex items-center gap-3 px-4 py-3 " +
                (i > 0 ? "border-t " : "") +
                (r.eu ? "bg-primary/5" : "")
              }
            >
              <span
                className={
                  "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold " +
                  (i === 0
                    ? "bg-amber-400 text-amber-950"
                    : i === 1
                      ? "bg-slate-300 text-slate-800"
                      : i === 2
                        ? "bg-orange-400 text-orange-950"
                        : "bg-secondary text-muted-foreground")
                }
              >
                {i + 1}
              </span>
              <span
                className={
                  "flex-1 text-sm " +
                  (r.eu ? "font-semibold text-primary" : "font-medium")
                }
              >
                {r.nome}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {r.pts.toLocaleString("pt-PT")} pts
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
