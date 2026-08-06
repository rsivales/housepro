"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, MessageCircleQuestion, Quote, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { GUIOES, type Guiao } from "@/lib/data/guioes";

const ICON: Record<string, string> = { angariacao: "🏷️", venda: "🤝", investidor: "📈" };

export default function GuioesPage() {
  const [active, setActive] = React.useState<Guiao["type"]>("angariacao");
  const guiao = GUIOES.find((g) => g.type === active)!;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <BookOpen className="size-7 text-primary" /> Guiões de reunião
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Roteiros de angariação e venda — o que dizer e fazer em cada fase, com
          frases-chave e respostas a objeções. Usa-os na reunião e na formação.
        </p>

        {/* Seletor */}
        <div className="mt-6 flex flex-wrap gap-2">
          {GUIOES.map((g) => (
            <button
              key={g.type}
              onClick={() => setActive(g.type)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active === g.type ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              )}
            >
              <span className="mr-1">{ICON[g.type]}</span> {g.title}
            </button>
          ))}
        </div>

        {/* Cabeçalho do guião */}
        <div className="mt-5 rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-5">
          <p className="font-display text-xl">{guiao.title}</p>
          <p className="text-sm text-muted-foreground">{guiao.subtitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">Duração típica: {guiao.duration}</p>
        </div>

        {/* Fases */}
        <div className="mt-5 space-y-2.5">
          {guiao.phases.map((p, i) => (
            <Phase key={i} phase={p} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Objeções */}
        <h2 className="mt-8 flex items-center gap-1.5 font-display text-xl">
          <MessageCircleQuestion className="size-5 text-primary" /> Respostas a objeções
        </h2>
        <div className="mt-3 space-y-2">
          {guiao.objections.map((o, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{o.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
          Dica: usa o guião a par da <Link href="/app/reuniao" className="font-medium text-primary hover:underline">Reunião Uau</Link> —
          o guião dá o discurso, a reunião dá os números e o PDF.
        </div>
      </div>
    </div>
  );
}

function Phase({ phase, defaultOpen }: { phase: Guiao["phases"][number]; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="font-medium">{phase.title}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t p-4">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Target className="mt-0.5 size-4 shrink-0 text-primary" /> <span><span className="font-medium text-foreground">Objetivo:</span> {phase.goal}</span>
          </p>
          <ul className="space-y-1.5">
            {phase.points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /> {pt}
              </li>
            ))}
          </ul>
          {phase.phrases?.map((ph, i) => (
            <p key={i} className="flex items-start gap-2 rounded-lg bg-primary/5 p-2.5 text-sm italic text-foreground">
              <Quote className="mt-0.5 size-4 shrink-0 text-primary" /> {ph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
