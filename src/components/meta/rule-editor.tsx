"use client";

import * as React from "react";
import { Loader2, Check, Plus, Trash2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ASSIGN_STRATEGY_LABEL,
  type AssignStrategy,
  type AssignmentRule,
} from "@/lib/data/meta";

interface Option { id: string; name: string }
type MapRow = { key: string; agentId: string };

const MAP_STRATEGIES: AssignStrategy[] = ["zone", "budget", "language", "specialty"];
const POOL_STRATEGIES: AssignStrategy[] = ["round_robin", "round_robin_weighted", "first_accept"];

/** Editor completo da regra de distribuição de uma campanha. */
export function RuleEditor({
  campaignId,
  agents,
  initial,
}: {
  campaignId: string;
  agents: Option[];
  initial?: AssignmentRule;
}) {
  const [strategy, setStrategy] = React.useState<AssignStrategy>(initial?.strategy ?? "unassigned");
  const [agentId, setAgentId] = React.useState(initial?.agentId ?? "");
  const [pool, setPool] = React.useState<string[]>(initial?.pool ?? []);
  const [weights, setWeights] = React.useState<Record<string, number>>(initial?.weights ?? {});
  const [rows, setRows] = React.useState<MapRow[]>(() => {
    const m = initial?.zoneMap ?? initial?.budgetMap ?? initial?.languageMap ?? initial?.specialtyMap;
    return m ? Object.entries(m).map(([key, agentId]) => ({ key, agentId })) : [];
  });
  const [substituteId, setSubstituteId] = React.useState(initial?.substituteId ?? "");
  const [fallbackId, setFallbackId] = React.useState(initial?.fallbackId ?? "");
  const [dailyLimit, setDailyLimit] = React.useState<string>(initial?.dailyLimit ? String(initial.dailyLimit) : "");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const usesPool = POOL_STRATEGIES.includes(strategy);
  const usesMap = MAP_STRATEGIES.includes(strategy);

  function toMap(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const r of rows) if (r.key.trim() && r.agentId) out[r.key.trim()] = r.agentId;
    return out;
  }

  async function save() {
    if (strategy === "specific" && !agentId) {
      setError("Escolhe o consultor específico.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    const map = usesMap ? toMap() : undefined;
    try {
      const res = await fetch("/api/meta/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          strategy,
          agentId: strategy === "specific" ? agentId : undefined,
          pool: usesPool ? pool : undefined,
          weights: strategy === "round_robin_weighted" ? weights : undefined,
          zoneMap: strategy === "zone" ? map : undefined,
          budgetMap: strategy === "budget" ? map : undefined,
          languageMap: strategy === "language" ? map : undefined,
          specialtyMap: strategy === "specialty" ? map : undefined,
          substituteId: substituteId || undefined,
          fallbackId: fallbackId || undefined,
          dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível guardar.");
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Estratégia</span>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value as AssignStrategy)} className="input">
          {(Object.keys(ASSIGN_STRATEGY_LABEL) as AssignStrategy[]).map((s) => (
            <option key={s} value={s}>{ASSIGN_STRATEGY_LABEL[s]}</option>
          ))}
        </select>
      </label>

      {strategy === "specific" && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Consultor específico *</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="input">
            <option value="">— selecionar —</option>
            {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </select>
        </label>
      )}

      {usesPool && (
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Consultores no conjunto</span>
          <div className="flex flex-wrap gap-2 rounded-lg border p-2">
            {agents.map((a) => {
              const on = pool.includes(a.id);
              return (
                <div key={a.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPool((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {a.name}
                  </button>
                  {on && strategy === "round_robin_weighted" && (
                    <input
                      type="number"
                      min={1}
                      value={weights[a.id] ?? 1}
                      onChange={(e) => setWeights((w) => ({ ...w, [a.id]: Math.max(1, Number(e.target.value)) }))}
                      className="input w-14"
                      aria-label={`Peso ${a.name}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {usesMap && (
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Mapa {ASSIGN_STRATEGY_LABEL[strategy].toLowerCase()} → consultor
          </span>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={r.key}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  placeholder={strategy === "zone" ? "Ex.: Albufeira" : strategy === "budget" ? "Ex.: 250k–500k" : strategy === "language" ? "Ex.: en" : "Ex.: luxo"}
                  className="input flex-1"
                />
                <select value={r.agentId} onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, agentId: e.target.value } : x)))} className="input flex-1">
                  <option value="">— consultor —</option>
                  {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
                <button type="button" aria-label="Remover" onClick={() => setRows((p) => p.filter((_, j) => j !== i))} className="rounded p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setRows((p) => [...p, { key: "", agentId: "" }])}>
              <Plus className="size-4" /> Adicionar linha
            </Button>
          </div>
        </div>
      )}

      {/* Comuns: substituto / fallback / limite diário */}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Substituto (indisponível)</span>
          <select value={substituteId} onChange={(e) => setSubstituteId(e.target.value)} className="input">
            <option value="">—</option>
            {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Fallback</span>
          <select value={fallbackId} onChange={(e) => setFallbackId(e.target.value)} className="input">
            <option value="">—</option>
            {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Limite diário</span>
          <input type="number" min={0} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="input" placeholder="sem limite" />
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={busy} size="sm">
        {busy ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : <Save className="size-4" />}
        {done ? "Guardada" : "Guardar distribuição"}
      </Button>
    </div>
  );
}
