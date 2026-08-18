"use client";

import * as React from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/data/leads";

interface CampaignOpt {
  id: string;
  name: string;
}

/**
 * Botão de demonstração: gera uma lead de teste que percorre o MESMO pipeline
 * de ingestão das leads reais (normalização → criação → atividade). Sem
 * credenciais Meta. Mostra o resultado para se ver o fluxo ponta-a-ponta.
 */
export function TestLeadButton({ campaigns }: { campaigns: CampaignOpt[] }) {
  const [campaignId, setCampaignId] = React.useState(campaigns[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [lead, setLead] = React.useState<Lead | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setLead(null);
    try {
      const res = await fetch("/api/meta/mock-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível gerar.");
      setLead(data.lead as Lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  if (campaigns.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" /> Simular lead recebida
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Gera uma lead de teste que passa pela normalização e cai no inbox “sem
        responsável”, tal como uma lead real do Meta.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="input flex-1"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Gerar lead
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {lead && (
        <div className="mt-3 rounded-lg border bg-secondary/40 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="size-4 text-primary" /> Lead criada
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Nome</dt>
            <dd>{lead.name}</dd>
            <dt className="text-muted-foreground">Contacto</dt>
            <dd>{lead.contact || "—"}</dd>
            {lead.zone && (
              <>
                <dt className="text-muted-foreground">Zona</dt>
                <dd>{lead.zone}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Pipeline</dt>
            <dd>{lead.pipeline}</dd>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{lead.unassigned ? "Sem responsável (inbox)" : "Atribuída"}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
