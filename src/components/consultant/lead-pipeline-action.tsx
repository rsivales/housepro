"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type LeadPipeline } from "@/lib/data/lead-pipelines";
import { Button } from "@/components/ui/button";

export function LeadPipelineAction({ leadId, current, pipelines }: { leadId: string; current?: string; pipelines: LeadPipeline[] }) {
  const [pipeline, setPipeline] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const router = useRouter();
  return <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={async (event) => {
    event.preventDefault();
    if (busy || !pipelines.some((p) => p.key === pipeline) || pipeline === current) return;
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/leads/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, pipeline, stage: 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Não foi possível atribuir a lead.");
      setResult("Lead atribuída. Foi colocada na primeira etapa do pipeline.");
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Não foi possível atribuir a lead.");
    } finally {
      setBusy(false);
    }
  }}>
    <label className="grid gap-1 text-sm">
      Pipeline de destino
      <select value={pipeline} onChange={(event) => { setPipeline(event.target.value); setResult(""); }} disabled={busy} className="rounded-lg border bg-background px-3 py-2">
        <option value="" disabled>Escolher pipeline</option>
        {current && !pipelines.some((p) => p.key === current) && <option value={current} disabled>{current}</option>}
        {pipelines.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
    </label>
    <Button type="submit" disabled={busy || !pipeline || pipeline === current}>{busy ? "A guardar…" : "Atribuir ao pipeline"}</Button>
    <p className="basis-full text-sm text-muted-foreground" role="status">{result || "Ao mudar de pipeline, a lead entra na primeira etapa."}</p>
  </form>;
}
