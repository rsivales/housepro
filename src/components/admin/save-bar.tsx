"use client";

import { Check, Loader2, AlertTriangle, ImageIcon } from "lucide-react";

export type SaveState = "idle" | "optimizing" | "saving" | "saved" | "error";

const MAP: Record<Exclude<SaveState, "idle">, { label: string; pct: number; tone: string }> = {
  optimizing: { label: "A otimizar a imagem…", pct: 40, tone: "var(--primary)" },
  saving: { label: "A guardar no servidor…", pct: 80, tone: "var(--primary)" },
  saved: { label: "Guardado ✓ — já está publicado", pct: 100, tone: "#1f8a5b" },
  error: { label: "Não foi possível guardar", pct: 100, tone: "var(--destructive)" },
};

/** Barra de estado do upload/gravação, para o utilizador saber que resultou. */
export function SaveBar({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const s = MAP[state];
  const Icon = state === "saved" ? Check : state === "error" ? AlertTriangle : state === "optimizing" ? ImageIcon : Loader2;
  return (
    <div className="mt-3 rounded-xl border bg-card p-3 shadow-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: s.tone }}>
        <Icon className={"size-4" + (state === "saving" ? " animate-spin" : "")} />
        {s.label}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={"h-full rounded-full transition-all duration-500" + (state === "saving" || state === "optimizing" ? " animate-pulse" : "")}
          style={{ width: `${s.pct}%`, background: s.tone }}
        />
      </div>
    </div>
  );
}
