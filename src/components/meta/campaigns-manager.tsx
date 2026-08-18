"use client";

import * as React from "react";
import { Plus, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_TYPE_LABEL,
  CAMPAIGN_STATUS,
  type Campaign,
  type CampaignType,
  type CampaignOwnerType,
} from "@/lib/data/meta";

interface Option {
  id: string;
  name: string;
}

/**
 * Gestão de campanhas Meta (lista + criação). Reutiliza o design system atual
 * (Card/Button + tokens). Funciona em modo demo (a criação devolve o objeto
 * sem persistir) e grava no Supabase quando ligado.
 *
 * Distingue explicitamente os papéis: DONO (agência/consultor) e RESPONSÁVEL.
 */
export function CampaignsManager({
  initial,
  agencies,
  agents,
}: {
  initial: Campaign[];
  agencies: Option[];
  agents: Option[];
}) {
  const [list, setList] = React.useState<Campaign[]>(initial);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CampaignType>("BUYER");
  const [ownerType, setOwnerType] = React.useState<CampaignOwnerType>("AGENCY");
  const [ownerId, setOwnerId] = React.useState(agencies[0]?.id ?? "");
  const [responsibleId, setResponsibleId] = React.useState("");
  const [objective, setObjective] = React.useState("");

  const owners = ownerType === "AGENCY" ? agencies : agents;

  // Ao trocar o tipo de dono, escolhe um destino válido por omissão.
  React.useEffect(() => {
    setOwnerId(owners[0]?.id ?? "");
  }, [ownerType]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const ownerName = owners.find((o) => o.id === ownerId)?.name;
      const responsibleName = agents.find((a) => a.id === responsibleId)?.name;
      const res = await fetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          ownerType,
          ownerId,
          ownerName,
          responsibleId: responsibleId || undefined,
          responsibleName,
          objective: objective || undefined,
          status: "ativa",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível criar.");
      setList((prev) => [data.campaign as Campaign, ...prev]);
      setDone(true);
      setName("");
      setObjective("");
      setResponsibleId("");
      setTimeout(() => setOpen(false), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.length} campanha{list.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Nova campanha
        </Button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-4 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da campanha" className="sm:col-span-2">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Compradores Algarve — Verão"
                className="input"
              />
            </Field>

            <Field label="Tipo">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CampaignType)}
                className="input"
              >
                {(Object.keys(CAMPAIGN_TYPE_LABEL) as CampaignType[]).map((t) => (
                  <option key={t} value={t}>
                    {CAMPAIGN_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Dono da campanha">
              <div className="flex gap-2">
                <select
                  value={ownerType}
                  onChange={(e) => setOwnerType(e.target.value as CampaignOwnerType)}
                  className="input w-32"
                >
                  <option value="AGENCY">Agência</option>
                  <option value="AGENT">Consultor</option>
                </select>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="input flex-1"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Responsável pela campanha" className="sm:col-span-2">
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="input"
              >
                <option value="">— sem responsável definido —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Objetivo (opcional)" className="sm:col-span-2">
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
                placeholder="Para que serve esta campanha?"
                className="input"
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : done ? (
                <Check className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {done ? "Criada" : "Criar campanha"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((c) => {
          const st = CAMPAIGN_STATUS[c.status];
          return (
            <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-tight">{c.name}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.badge}`}>
                  {st.label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                  {CAMPAIGN_TYPE_LABEL[c.type]}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                  {c.ownerType === "AGENCY" ? "Agência" : "Consultor"}: {c.ownerName ?? c.ownerId}
                </span>
              </div>
              {c.responsibleName && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Responsável: {c.responsibleName}
                </p>
              )}
              {c.objective && (
                <p className="mt-1 text-xs text-muted-foreground">{c.objective}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
