"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, Home, MapPin, Pencil, Plus, Save, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import type { Agent } from "@/lib/data/types";
import { slugify, type AgenciesConfig } from "@/lib/data/agencies";

interface TeamMember { id: string; name: string; role: string; photo: string | null; accent: string }
interface BaseAgency {
  id: string; name: string; region: string; slug: string; code: number;
  propertyCount: number; team: TeamMember[];
}
type Row = BaseAgency & { created?: boolean };

const box = "rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/** Gestão de agências: criar, renomear/editar região e abrir o detalhe (equipa + imóveis). */
export function AgenciesAdmin({ base, initial }: { base: BaseAgency[]; initial: AgenciesConfig }) {
  const [overrides, setOverrides] = React.useState<AgenciesConfig["overrides"]>(initial.overrides ?? {});
  const [created, setCreated] = React.useState<AgenciesConfig["created"]>(initial.created ?? []);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; region: string }>({ name: "", region: "" });
  const [creating, setCreating] = React.useState(false);
  const [newAg, setNewAg] = React.useState({ name: "", region: "" });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<null | "ok" | "demo" | "err">(null);

  // Linhas a mostrar = base (com overrides) + criadas.
  const rows: Row[] = [
    ...base.map((a) => ({
      ...a,
      name: overrides[a.id]?.name ?? a.name,
      region: overrides[a.id]?.region ?? a.region,
    })),
    ...created.map((c) => ({ id: c.id, name: c.name, region: c.region, slug: c.slug, code: c.code, propertyCount: 0, team: [] as TeamMember[], created: true })),
  ];

  function startEdit(r: Row) {
    setEditing(r.id);
    setDraft({ name: r.name, region: r.region });
  }
  function applyEdit(r: Row) {
    if (r.created) {
      setCreated((prev) => prev.map((c) => (c.id === r.id ? { ...c, name: draft.name.trim() || c.name, region: draft.region.trim() || c.region } : c)));
    } else {
      setOverrides((prev) => ({ ...prev, [r.id]: { name: draft.name.trim() || r.name, region: draft.region.trim() || r.region } }));
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
    setCreated((prev) => [...prev, { id, name, slug, region: newAg.region.trim() || "—", code }]);
    setNewAg({ name: "", region: "" });
    setCreating(false);
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    const config: AgenciesConfig = { overrides, created };
    try {
      const res = await fetch("/api/brand/agencies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) setSaved("ok");
      else if (res.status === 401) setSaved("demo");
      else setSaved("err");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
      try { localStorage.setItem("agenciesConfig", JSON.stringify(config)); } catch {}
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Criar */}
      {creating ? (
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
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)}><Plus className="size-4" /> Nova agência</Button>
      )}

      {/* Lista */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const isEditing = editing === r.id;
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border bg-card shadow-sm">
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
                    <p className="flex items-center gap-2 font-medium">
                      {r.name}
                      {r.created && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">nova</span>}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="size-3.5" /> Editar</Button>
                      <button onClick={() => setOpenId(isOpen ? null : r.id)} className="rounded-lg border p-2 text-muted-foreground hover:bg-secondary">
                        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Detalhe: equipa + info */}
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
                    <span>Código: <span className="font-mono">{String(r.code).padStart(2, "0")}</span></span>
                    <span>Imóveis ativos: {r.propertyCount}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guardar */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "A guardar…" : "Guardar alterações"}</Button>
        {saved === "ok" && <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="size-4" /> Guardado.</span>}
        {saved === "demo" && <span className="text-sm text-muted-foreground">Guardado localmente (modo demo — sem Supabase).</span>}
        {saved === "err" && <span className="text-sm text-destructive">Falha ao guardar.</span>}
      </div>
    </div>
  );
}
