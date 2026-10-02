"use client";

export type UploadState = { percent: number; label: string; tone?: "progress" | "success" | "error" };

export function UploadProgress({ state }: { state?: UploadState }) {
  if (!state) return null;
  const color = state.tone === "error" ? "bg-destructive" : "bg-emerald-600";
  const text = state.tone === "error" ? "text-destructive" : state.tone === "success" ? "text-emerald-700" : "text-muted-foreground";
  return (
    <div className="mt-2 w-full max-w-sm" role={state.tone === "error" ? "alert" : "status"} aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div role="progressbar" aria-label="Estado do upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.percent} className={`h-full rounded-full transition-[width] duration-300 ${color}`} style={{ width: `${state.percent}%` }} />
      </div>
      <p className={`mt-1 text-xs font-medium ${text}`}>{state.label}</p>
    </div>
  );
}
