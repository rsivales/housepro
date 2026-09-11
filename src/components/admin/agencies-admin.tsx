"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, Home, Loader2, MapPin, Pause, Pencil, Play, Plus, RotateCcw, Trash2, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import type { Agent } from "@/lib/data/types";
import { slugify, type AgenciesConfig } from "@/lib/data/agencies";
import { AgencyProfileEditor } from "@/components/admin/agency-profile-editor";
import { FileText } from "lucide-react";

interface TeamMember { id: string; name: string; role: string; photo: string | null; accent: string; gross?: number }
interface BaseAgency {
  id: string; name: string; region: string; slug: string; code: number;
  propertyCount: number; team: TeamMember[]; production?: number;
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
type Row = BaseAgency & { created?: boolean; suspended?: boolean };

const box = "rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/**
 * Gestão de agências (direção/super admin): criar, editar, suspender/reativar e
 * eliminar. Cada alteração é guardada automaticamente no Supabase
 * (site_settings), com o localStorage como cache/fallback em modo demo.
 */
export function AgenciesAdmin({ base, initial }: { base: BaseAgency[]; initial: AgenciesConfig }) {
  const [cfg, setCfg] = React.useState<AgenciesConfig>({
    overrides: initial.overrides ?? {},
    created: initial.created ?? [],
    suspended: initial.suspended ?? [],
    removed: initial.removed ?? [],
  });
  const [editing, setEditing] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [fichaId, setFichaId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; region: string }>({ name: "", region: "" });
  const [creating, setCreating] = React.useState(false);
  const [newAg, setNewAg] = React.useState({ name: "", region: "" });
  const [status, setStatus] = React.useState<null | "saving" | "ok" | "demo" | "err">(null);

  const suspended = new Set(cfg.suspended ?? []);
  const removed = new Set(cfg.removed ?? []);

  // Guarda automaticamente a configuração completa.
  const commit = React.useCallback(async (next: AgenciesConfig) => {
    setCfg(next);
    setStatus("saving");
    try {
      const res = await fetch("/api/brand/agencies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: next }),
      });
      setStatus(res.ok ? "ok" : res.status === 401 ? "demo" : "err");
    } catch {
      setStatus("err");
    } finally {
      try { localStorage.setItem("agenciesConfig", JSON.stringify(next)); } catch {}
      setTimeout(() => setStatus((s) => (s === "saving" ? s : null)), 2500);
    }
  }, []);

  // Linhas visíveis = base (sem eliminadas, com overrides) + criadas.
  const rows: Row[] = [
    ...base
      .filter((a) => !removed.has(a.id))
      .map((a) => ({
        ...a,
        name: cfg.overrides[a.id]?.name ?? a.name,
        region: cfg.overrides[a.id]?.region ?? a.region,
        suspended: suspended.has(a.id),
      })),
    ...(cfg.created ?? []).map((c) => ({
      id: c.id, name: c.name, region: c.region, slug: c.slug, code: c.code,
      propertyCount: 0, team: [] as TeamMember[], created: true, suspended: suspended.has(c.id),
    })),
  ];
  const removedRows = base.filter((a) => removed.has(a.id));

  function startEdit(r: Row) {
    setEditing(r.id);
    setDraft({ name: r.name, region: r.region });
  }
  function applyEdit(r: Row) {
    const name = draft.name.trim();
    const region = draft.region.trim();
    if (r.created) {
      commit({ ...cfg, created: cfg.created.map((c) => (c.id === r.id ? { ...c, name: name || c.name, region: region || c.region } : c)) });
    } else {
      commit({ ...cfg, overrides: { ...cfg.overrides, [r.id]: { name: name || r.name, region: region || r.region } } });
    }
    setEditing(null);
  }
  function addAgency() {
    const name = newAg.name.trim();
    if (!name) return;
    const slug = slugify(name);
    const used = new Set(rows.map((r) => r.code));
    let code = 1;
    while (used.has(code)) code += 1;
    const id = `ag-${slug}-${Date.now().toString(36).slice(-4)}`;
    commit({ ...cfg, created: [...cfg.created, { id, name, slug, region: newAg.region.trim() || "—", code }] });
    setNewAg({ name: "", region: "" });
    setCreating(false);
  }
  function toggleSuspend(r: Row) {
    const set = new Set(cfg.suspended ?? []);
    if (set.has(r.id)) set.delete(r.id); else set.add(r.id);
    commit({ ...cfg, suspended: [...set] });
  }
  function remove(r: Row) {
    if (!confirm(`Eliminar a agência "${r.name}"? Deixa de aparecer no site. ${r.created ? "Esta ação é definitiva para agências criadas." : "Podes repor depois."}`)) return;
    if (r.created) {
      commit({ ...cfg, created: cfg.created.filter((c) => c.id !== r.id), suspended: (cfg.suspended ?? []).filter((i) => i !== r.id) });
    } else {
      commit({ ...cfg, removed: [...new Set([...(cfg.removed ?? []), r.id])] });
    }
  }
  function restore(id: string) {
    commit({ ...cfg, removed: (cfg.removed ?? []).filter((i) => i !== id) });
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Barra de estado da gravação */}
      <div className="flex items-center justify-between">
        {creating ? <span /> : (
          <Button variant="outline" onClick={() => setCreating(true)}><Plus className="size-4" /> Nova agência</Button>
        )}
        <span className="text-sm" aria-live="polite">
          {status === "saving" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A guardar…</span>}
          {status === "ok" && <span className="inline-flex items-center gap-1 text-primary"><Check className="size-4" /> Guardado</span>}
          {status === "demo" && <span className="text-muted-foreground">Guardado localmente (modo demo)</span>}
          {status === "err" && <span className="text-destructive">Falha ao guardar</span>}
        </span>
      </div>

      {creating && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">Nova agência</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className={box} placeholder="Nome (ex.: HousePro Aveiro)" value={newAg.name} onChange={(e) => setNewAg((s) => ({ ...s, name: e.target.value }))} />
            <input className={box} placeholder="Região (ex.: Aveiro)" value={newAg.region} onChange={(e) => setNewAg((s) => ({ ...s, region: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={addAgency} disabled={!newAg.name.trim()}><Check className="size-3.5" /> Criar</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Visão global da rede */}
      {(() => {
        const totalAgents = rows.reduce((s, r) => s + r.team.length, 0);
        const totalProd = rows.reduce((s, r) => s + (r.production ?? 0), 0);
        const maxProd = Math.max(1, ...rows.map((r) => r.production ?? 0));
        return (
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Agências ativas" value={String(rows.filter((r) => !r.suspended).length)} />
              <Stat label="Consultores" value={String(totalAgents)} />
              <Stat label="Produção total" value={totalProd > 0 ? eur(totalProd) : "—"} />
            </div>
            {totalProd > 0 ? (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produção por agência</p>
                {rows.filter((r) => (r.production ?? 0) > 0).sort((a, b) => (b.production ?? 0) - (a.production ?? 0)).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate">{r.name}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${((r.production ?? 0) / maxProd) * 100}%` }} />
                    </span>
                    <span className="w-24 shrink-0 text-right font-medium tabular-nums">{eur(r.production ?? 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Sem produção registada ainda — os valores aparecem quando os consultores tiverem faturação lançada.</p>
            )}
          </div>
        );
      })()}

      {/* Lista */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const isEditing = editing === r.id;
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className={cn("rounded-2xl border bg-card shadow-sm", r.suspended && "opacity-70")}>
              <div className="flex items-center gap-3 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                {isEditing ? (
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <input className={box} value={draft.name} onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))} />
                    <input className={box} value={draft.region} onChange={(e) => setDraft((s) => ({ ...s, region: e.target.value }))} />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {r.name}
                      {r.created && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">nova</span>}
                      {r.suspended && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">suspensa</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {r.region}</span>
                      <span className="inline-flex items-center gap-1"><Users className="size-3" /> {r.team.length}</span>
                      <span className="inline-flex items-center gap-1"><Home className="size-3" /> {r.propertyCount}</span>
                      <span className="font-mono">cod. {String(r.code).padStart(2, "0")}</span>
                    </p>
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => applyEdit(r)}><Check className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="size-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="size-3.5" /> Nome</Button>
                      <Button size="sm" variant={fichaId === r.id ? "default" : "outline"} onClick={() => setFichaId(fichaId === r.id ? null : r.id)}><FileText className="size-3.5" /> Ficha</Button>
                      <button onClick={() => toggleSuspend(r)} title={r.suspended ? "Reativar" : "Suspender"} className="grid size-9 place-items-center rounded-lg border text-muted-foreground hover:bg-secondary">
                        {r.suspended ? <Play className="size-4 text-emerald-600" /> : <Pause className="size-4" />}
                      </button>
                      <button onClick={() => remove(r)} title="Eliminar" className="grid size-9 place-items-center rounded-lg border text-destructive hover:bg-destructive/5">
                        <Trash2 className="size-4" />
                      </button>
                      <button onClick={() => setOpenId(isOpen ? null : r.id)} aria-label="Detalhe" className="grid size-9 place-items-center rounded-lg border text-muted-foreground hover:bg-secondary">
                        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isOpen && !isEditing && (
                <div className="border-t p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipa</p>
                  {r.team.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {[...r.team].sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0)).map((m) => {
                        const maxG = Math.max(1, ...r.team.map((x) => x.gross ?? 0));
                        return (
                          <li key={m.id} className="flex items-center gap-2.5 rounded-xl border p-2">
                            <AgentAvatar agent={{ id: m.id, name: m.name, photo: m.photo ?? undefined, accent: m.accent } as Agent} className="size-8 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{m.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                            </div>
                            <div className="hidden w-40 sm:block">
                              <span className="block h-1.5 overflow-hidden rounded-full bg-secondary">
                                <span className="block h-full rounded-full bg-primary" style={{ width: `${((m.gross ?? 0) / maxG) * 100}%` }} />
                              </span>
                            </div>
                            <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">{(m.gross ?? 0) > 0 ? eur(m.gross ?? 0) : "—"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sem consultores associados.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Consultores: <strong className="text-foreground">{r.team.length}</strong></span>
                    <span>Produção da agência: <strong className="text-foreground">{(r.production ?? 0) > 0 ? eur(r.production ?? 0) : "—"}</strong></span>
                    <span>Imóveis ativos: <strong className="text-foreground">{r.propertyCount}</strong></span>
                    <span>Código: <span className="font-mono">{String(r.code).padStart(2, "0")}</span></span>
                  </div>
                </div>
              )}

              {fichaId === r.id && !isEditing && (
                <div className="border-t bg-secondary/20">
                  <AgencyProfileEditor agencyId={r.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Eliminadas (repor) */}
      {removedRows.length > 0 && (
        <div className="rounded-2xl border border-dashed bg-secondary/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eliminadas</p>
          <ul className="mt-2 space-y-1.5">
            {removedRows.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground line-through">{cfg.overrides[a.id]?.name ?? a.name}</span>
                <button onClick={() => restore(a.id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  <RotateCcw className="size-3.5" /> Repor
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
