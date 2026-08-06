/** Progresso de formação — guardado localmente (protótipo). */

import type { Course } from "@/lib/data/formacao";

const KEY = "formacaoProgress";

export function readProgress(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeProgress(p: Record<string, string[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function courseProgress(course: Course, doneIds: string[]) {
  const total = course.lessons.length;
  const completed = course.lessons.filter((l) => doneIds.includes(l.id)).length;
  return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };
}
