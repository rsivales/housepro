"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, FileText, Home, Loader2, MapPin, Pause, Pencil, Play, Plus, Trash2, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import type { Agent, Agency } from "@/lib/data/types";
import { AgencyProfileEditor } from "@/components/admin/agency-profile-editor";

interface TeamMember { id: string; name: string; role: string; photo: string | null; accent: string }
type Row = Agency & { propertyCount: number; team: TeamMember[] };

const box = "rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/**
 * Gestão de agências — tabela real `agencies` (nunca localStorage/site_settings
 * como única cópia). `isNetworkAdmin` controla quem pode abrir/renomear/
 * suspender/eliminar agências (rede) vs. quem só edita a ficha pública da
 * própria agência (broker/diretor) — o servidor aplica a mesma regra.
 */
export function AgenciesAdmin({ base, isNetworkAdmin }: { base: Row[]; isNetworkAdmin: boolean }) {
  const [rows, setRows] = React.useState<Row[]>(base);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [fichaId, setFichaId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; region: string }>({ name: "", region: "" });
  const [creating, setCreating] = React.useState(false);
  const [newAg, setNewAg] = React.useState({ name: "", region: "" });
  const [status, setStatus] = React.useState<null | "saving" | "ok" | "err">(null);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  function flash(ok: boolean, msg?: string) {
    setStatus(ok ? "ok" : "err");
    setErrMsg(ok ? null : (msg ?? "Falha ao guardar."));
    setTimeout(() => setStatus((s) => (s === "saving" ? s : null)), 2500);
  }

  async function patchAgency(id: string, patch: Record<string, unknown>, applyLocal: (r: Row) => Row) {
    setRows((rs) => rs.map((r) => (r.id === id ? applyLocal(r) : r)));
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/agencies", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const j = await res.json().catch(() => ({}));
      flash(res.ok, j.error);
    } catch {
      flash(false, "Falha de rede.");
    }
  }

  function startEdit(r: Row) {
    setEditing(r.id);
    setDraft({ name: r.name, region: r.region });
  }
  function applyEdit(r: Row) {
    const name = draft.name.trim();
    const region = draft.region.trim();
    if (!name && !region) { setEditing(null); return; }
    void patchAgency(r.id, { ...(name && { name }), ...(region && { region }) }, (row) => ({ ...row, name: name || row.name, region: region || row.region }));
    setEditing(null);
  }
  async function addAgency() {
    const name = newAg.name.trim();
    if (!name) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, region: newAg.region.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { flash(false, j.error); return; }
      setRows((rs) => [...rs, { id: j.id, name, region: newAg.region.trim() || "—", slug: "", code: undefined, propertyCount: 0, team: [] }]);
      flash(true);
      setNewAg({ name: "", region: "" });
      setCreating(false);
    } catch {
      flash(false, "Falha de rede.");
    }
  }
  function toggleSuspend(r: Row) {
    void patchAgency(r.id, { suspended: !r.suspended }, (row) => ({ ...row, suspended: !row.suspended }));
  }
  async function remove(r: Row) {
    if (!confirm(`Eliminar a agência "${r.name}"? Esta ação é definitiva.`)) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/agencies?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { flash(false, j.error); return; }
      setRows((rs) => rs.filter((row) => row.id !== r.id));
      flash(true);
    } catch {
      flash(false, "Falha de rede.");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        {isNetworkAdmin && (
          creating ? <span /> : (
            <Button variant="outline" onClick={() => setCreating(true)}><Plus className="size-4" /> Nova agência</Button>
          )
        )}
        <span className="text-sm" aria-live="polite">
          {status === "saving" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A guardar…</span>}
          {status === "ok" && <span className="inline-flex items-center gap-1 text-primary"><Check className="size-4" /> Guardado</span>}
          {status === "err" && <span className="text-destructive">{errMsg ?? "Falha ao guardar"}</span>}
        </span>
      </div>

      {isNetworkAdmin && creating && (
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
                      {r.suspended && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">suspensa</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {r.region}</span>
                      <span className="inline-flex items-center gap-1"><Users className="size-3" /> {r.team.length}</span>
                      <span className="inline-flex items-center gap-1"><Home className="size-3" /> {r.propertyCount}</span>
                      {r.code != null && <span className="font-mono">cod. {String(r.code).padStart(2, "0")}</span>}
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
                      {isNetworkAdmin && (
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="size-3.5" /> Nome</Button>
                      )}
                      <Button size="sm" variant={fichaId === r.id ? "default" : "outline"} onClick={() => setFichaId(fichaId === r.id ? null : r.id)}><FileText className="size-3.5" /> Ficha</Button>
                      {isNetworkAdmin && (
                        <>
                          <button onClick={() => toggleSuspend(r)} title={r.suspended ? "Reativar" : "Suspender"} className="grid size-9 place-items-center rounded-lg border text-muted-foreground hover:bg-secondary">
                            {r.suspended ? <Play className="size-4 text-emerald-600" /> : <Pause className="size-4" />}
                          </button>
                          <button onClick={() => remove(r)} title="Eliminar" className="grid size-9 place-items-center rounded-lg border text-destructive hover:bg-destructive/5">
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
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
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {r.team.map((m) => (
                        <li key={m.id} className="flex items-center gap-2.5 rounded-xl border p-2">
                          <AgentAvatar agent={{ id: m.id, name: m.name, photo: m.photo ?? undefined, accent: m.accent } as Agent} className="size-8" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sem consultores associados.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Slug: <span className="font-mono">{r.slug}</span></span>
                    {r.code != null && <span>Código: <span className="font-mono">{String(r.code).padStart(2, "0")}</span></span>}
                    <span>Imóveis ativos: {r.propertyCount}</span>
                  </div>
                </div>
              )}

              {fichaId === r.id && !isEditing && (
                <div className="border-t bg-secondary/20">
                  <AgencyProfileEditor agency={r} onSaved={(next) => setRows((rs) => rs.map((row) => (row.id === r.id ? { ...row, ...next } : row)))} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
