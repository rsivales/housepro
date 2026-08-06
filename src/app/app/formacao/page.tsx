"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";
import { COURSES, CATEGORY_LABEL, LEVEL_LABEL, courseMinutes } from "@/lib/data/formacao";
import { readProgress, courseProgress } from "@/lib/data/formacao-progress";

export default function FormacaoPage() {
  const [progress, setProgress] = React.useState<Record<string, string[]>>({});
  React.useEffect(() => { setProgress(readProgress()); }, []);

  const totalLessons = COURSES.reduce((s, c) => s + c.lessons.length, 0);
  const done = Object.values(progress).reduce((s, arr) => s + (arr?.length ?? 0), 0);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <GraduationCap className="size-7 text-primary" /> Formação
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A academia HousePro — percursos de angariação, venda, jurídico, marketing e ética.
          Conclui as aulas e recebe a certificação interna.
        </p>

        <div className="mt-4 rounded-xl border bg-secondary/40 px-4 py-2.5 text-sm text-muted-foreground">
          Progresso global: <span className="font-medium text-foreground">{done}/{totalLessons}</span> aulas concluídas
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {COURSES.map((c) => {
            const pr = courseProgress(c, progress[c.id] ?? []);
            return (
              <Link key={c.id} href={`/app/formacao/${c.id}`} className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">{c.cover}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{c.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2 py-0.5">{CATEGORY_LABEL[c.category]}</span>
                  <span>{LEVEL_LABEL[c.level]}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {courseMinutes(c)} min</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full", pr.pct === 100 ? "bg-primary" : "bg-primary/70")} style={{ width: `${pr.pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pr.completed}/{pr.total} aulas {pr.pct === 100 && "· ✓ concluído"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
