"use client";

import * as React from "react";
import { UserPlus, Loader2, ThumbsUp, ThumbsDown, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/data/leads";
import { scoreBand } from "@/lib/meta/scoring";

interface Option {
  id: string;
  name: string;
}

/**
 * Inbox "Leads sem responsável": cada lead exige atribuição a um CONSULTOR
 * ESPECÍFICO (campo obrigatório) antes de sair do inbox. Inclui qualificação
 * rápida. Ao atribuir, a lead sai da lista.
 */
export function LeadInbox({
  initial,
  agents,
  campaignName,
}: {
  initial: Lead[];
  agents: Option[];
  campaignName: Record<string, string>;
}) {
  const [list, setList] = React.useState<Lead[]>(initial);

  if (list.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        Sem leads por distribuir. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((lead) => (
        <InboxCard
          key={lead.id}
          lead={lead}
          agents={agents}
          campaignLabel={lead.campaignId ? campaignName[lead.campaignId] : undefined}
          onAssigned={() => setList((prev) => prev.filter((l) => l.id !== lead.id))}
        />
      ))}
    </div>
  );
}

function InboxCard({
  lead,
  agents,
  campaignLabel,
  onAssigned,
}: {
  lead: Lead;
  agents: Option[];
  campaignLabel?: string;
  onAssigned: () => void;
}) {
  const [agentId, setAgentId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [qualified, setQualified] = React.useState<Lead["qualification"]>(lead.qualification);
  const band = scoreBand(lead.score ?? 0);

  async function assign() {
    if (!agentId) {
      setError("Escolhe o consultor específico.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, agentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível atribuir.");
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  async function qualify(q: Lead["qualification"]) {
    setQualified(q);
    try {
      await fetch("/api/leads/qualify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, qualification: q, score: lead.score }),
      });
    } catch {
      /* best-effort na demo */
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium leading-tight">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.contact || "sem contacto"}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${band.badge}`}>
            <Flame className="size-3" /> {band.label} · {lead.score ?? 0}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {campaignLabel && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {campaignLabel}
          </span>
        )}
        {lead.zone && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {lead.zone}
          </span>
        )}
        {lead.budget && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {lead.budget}
          </span>
        )}
        {lead.pipeline && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {lead.pipeline}
          </span>
        )}
      </div>

      {lead.message && (
        <p className="mt-2 text-sm text-muted-foreground">{lead.message}</p>
      )}

      {/* Qualificação rápida */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Qualificar:</span>
        <button
          onClick={() => qualify("qualificado")}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
            qualified === "qualificado"
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <ThumbsUp className="size-3" /> Qualificada
        </button>
        <button
          onClick={() => qualify("desqualificado")}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
            qualified === "desqualificado"
              ? "bg-destructive/15 text-destructive"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <ThumbsDown className="size-3" /> Desqualificada
        </button>
      </div>

      {/* Atribuição obrigatória a consultor específico */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        <label className="text-[11px] font-medium text-muted-foreground">
          Consultor específico *
        </label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="input w-56 flex-1"
        >
          <option value="">— escolher consultor —</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={assign} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Atribuir
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
