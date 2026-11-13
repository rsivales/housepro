"use client";

import * as React from "react";
import { Filter, Plus, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { CrmBoard, type CrmBoardOption, type CrmBoardPrefill } from "@/components/app/crm-board";
import { LeadsBoard, type LeadCard } from "@/components/app/leads-board";
import { CUSTOM_PIPELINE_KEY, DEFAULT_CUSTOM_STAGES, validPipelineSettings, type LeadPipeline } from "@/lib/data/lead-pipelines";
import type { DealListItem } from "@/lib/db/deals";

/** CRM com pipelines SEPARADOS: Negócios (transação) e Leads (compradores /
 *  proprietários). As leads que entram classificam-se no seu próprio pipeline,
 *  sem se misturarem com os negócios. */
export function CrmTabs({
  deals,
  leads,
  pipelines,
  agencies = [],
  prefill,
  canManage = false,
}: {
  deals: DealListItem[];
  leads: LeadCard[];
  pipelines: LeadPipeline[];
  agencies?: CrmBoardOption[];
  prefill?: CrmBoardPrefill;
  /** Staff (coordenação/direção/admin) — pode apagar negócios. */
  canManage?: boolean;
}) {
  const [tab, setTab] = React.useState<string>("negocios");

  const [local, setLocal] = React.useState<LeadPipeline[]>([]);
  const [editor, setEditor] = React.useState<{ key?: string; name: string; stages: string[] } | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const available = [...pipelines.filter((p) => !local.some((l) => l.key === p.key)), ...local];
  const pipeline = available.find((p) => p.key === tab);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    if (!validPipelineSettings(editor.name, editor.stages)) { setError("Indique um nome e entre 2 e 12 etapas com nomes distintos."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/leads/pipelines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocal((prev) => [...prev.filter((p) => p.key !== data.key), data]);
      setTab(data.key);
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Não foi possível guardar.");
    } finally { setBusy(false); }
  }

  const tabs = [
    { key: "negocios", label: "Negócios" },
    ...available.map((p) => ({ key: p.key, label: `Leads · ${p.label}` })),
  ];

  return (
    <div>
      {/* Alternador de pipelines */}
      <div className="inline-flex flex-wrap gap-1 rounded-full border bg-card p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="size-3.5" /> {t.label}
          </button>
        ))}
        {canManage && <button type="button" aria-label="Novo pipeline" onClick={() => { setError(""); setEditor({ name: "", stages: [...DEFAULT_CUSTOM_STAGES] }); }}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary">
          <Plus className="size-4" /> Pipeline
        </button>}
      </div>
      {editor && <form onSubmit={save} className="mt-4 max-w-xl space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">{editor.key ? "Editar pipeline" : "Novo pipeline de leads"}</h2>
        <label className="grid gap-1 text-sm">Nome do pipeline
          <input required maxLength={60} value={editor.name} disabled={busy} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className="rounded-lg border px-3 py-2" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {editor.stages.map((stage, i) => <label key={i} className="grid gap-1 text-sm">Etapa {i + 1}
            <input required maxLength={40} value={stage} disabled={busy} className="rounded-lg border px-3 py-2"
              onChange={(e) => setEditor({ ...editor, stages: editor.stages.map((s, j) => i === j ? e.target.value : s) })} />
          </label>)}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" disabled={busy || editor.stages.length >= 12} onClick={() => setEditor({ ...editor, stages: [...editor.stages, ""] })}>+ Etapa</button>
          {!editor.key && <button type="button" disabled={busy || editor.stages.length <= 2} onClick={() => setEditor({ ...editor, stages: editor.stages.slice(0, -1) })}>Remover última etapa</button>}
          <button type="submit" disabled={busy} className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">{busy ? "A guardar…" : "Guardar pipeline"}</button>
          <button type="button" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>}

      <div className="mt-6">
        {!pipeline ? (
          <CrmBoard initial={deals} agencies={agencies} prefill={prefill} canManage={canManage} />
        ) : (
          <div>
            <p className="text-sm font-medium text-primary">Área do consultor</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">CRM · Leads · {pipeline.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui aparecem leads com telefone. Arraste os cartões para mudar de etapa.
            </p>
            {canManage && CUSTOM_PIPELINE_KEY.test(pipeline.key) && <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm text-primary" onClick={() => {
              setError(""); setEditor({ key: pipeline.key, name: pipeline.label, stages: [...pipeline.stages] });
            }}><Pencil className="size-4" /> Editar pipeline</button>}
            <LeadsBoard pipeline={pipeline} leads={leads} pipelines={available} />
          </div>
        )}
      </div>
    </div>
  );
}
