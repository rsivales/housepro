"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Check, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { courseById, CATEGORY_LABEL, LEVEL_LABEL, courseMinutes } from "@/lib/data/formacao";
import { readProgress, writeProgress, courseProgress } from "@/lib/data/formacao-progress";

export default function CoursePage() {
  const params = useParams();
  const id = String(params.id);
  const course = courseById(id);

  const [done, setDone] = React.useState<string[]>([]);
  React.useEffect(() => { setDone(readProgress()[id] ?? []); }, [id]);

  if (!course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-muted-foreground">Curso não encontrado.</p>
        <Link href="/app/formacao" className="mt-3 inline-block text-primary hover:underline">Voltar à formação</Link>
      </div>
    );
  }

  function toggle(lessonId: string) {
    setDone((prev) => {
      const next = prev.includes(lessonId) ? prev.filter((x) => x !== lessonId) : [...prev, lessonId];
      const all = readProgress();
      all[id] = next;
      writeProgress(all);
      return next;
    });
  }

  const pr = courseProgress(course, done);
  const complete = pr.pct === 100;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app/formacao" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Formação
        </Link>

        <div className="mt-4 flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-3xl">{course.cover}</span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">{course.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-2 py-0.5">{CATEGORY_LABEL[course.category]}</span>
              <span>{LEVEL_LABEL[course.level]}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {courseMinutes(course)} min</span>
            </div>
          </div>
        </div>

        {/* Progresso */}
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pr.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{pr.completed}/{pr.total} aulas concluídas</p>
        </div>

        {/* Aulas */}
        <ul className="mt-5 space-y-2">
          {course.lessons.map((l, i) => {
            const isDone = done.includes(l.id);
            return (
              <li key={l.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle(l.id)}
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border transition-colors",
                      isDone ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"
                    )}
                    aria-label={isDone ? "Marcar por concluir" : "Marcar concluída"}
                  >
                    {isDone ? <Check className="size-4" /> : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}>{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.minutes} min</p>
                  </div>
                  {l.href && (
                    <Link href={l.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Abrir <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Certificado */}
        {complete && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 to-transparent p-6 text-center">
            <Award className="mx-auto size-10 text-primary" />
            <p className="mt-2 font-display text-xl">Curso concluído!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ganhaste a certificação interna «{course.title}». Continua o teu percurso na academia HousePro.
            </p>
            <Button asChild className="mt-4"><Link href="/app/formacao">Ver mais cursos</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
