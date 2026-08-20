import * as React from "react";

import { HelixMark } from "./helix-logo";

/** Loading Helix — a hélice roda suavemente (respeita reduzir movimento via CSS). */
export function HelixLoader({ size = 40, label = "A carregar…" }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10" role="status" aria-live="polite">
      <HelixMark size={size} className="hx-red hx-spin" />
      <span className="text-sm hx-muted">{label}</span>
    </div>
  );
}

/** Skeleton genérico (bloco cinza com brilho). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--hx-surface-blue)] ${className ?? ""}`} />;
}

/** Estado vazio — ícone, título, descrição e ação opcional. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--hx-radius)] border border-dashed border-[var(--hx-border)] px-6 py-10 text-center">
      {icon && <div className="mb-2 text-[var(--hx-text-2)]">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm hx-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export type BadgeTone = "blue" | "navy" | "red" | "warn" | "success";

/** Etiqueta de estado — tom semântico (vermelho reservado a urgência/quente). */
export function StatusBadge({ tone = "blue", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`hx-chip hx-chip-${tone}`}>{children}</span>;
}

/**
 * Donut de KPI — anel de progresso com valor central. SVG puro (sem libs).
 * `tone` controla a cor do anel; o resto do círculo fica ténue.
 */
export function KpiDonut({
  value,
  max = 100,
  centerLabel,
  tone = "blue",
  size = 84,
}: {
  value: number;
  max?: number;
  centerLabel: React.ReactNode;
  tone?: "blue" | "navy" | "warn" | "success" | "red";
  size?: number;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = `var(--hx-${tone === "blue" ? "blue" : tone})`;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hx-surface-blue)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{centerLabel}</div>
    </div>
  );
}

/** Mini-tendência (sparkline) — SVG suave. */
export function Sparkline({ points, tone = "blue", width = 120, height = 26 }: { points: number[]; tone?: "blue" | "navy"; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - ((p - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={`var(--hx-${tone})`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}
