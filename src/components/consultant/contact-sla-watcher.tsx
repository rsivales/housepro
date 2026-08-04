"use client";

import * as React from "react";
import { AlertTriangle, Clock, RefreshCw, ShieldAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONTACT_SLA_HOURS, CONTACT_ESCALATION_HOURS } from "@/lib/data/contact-sla";

type Outcome = { leadId: string; name: string; outcome: string; toName?: string };

/**
 * SLA de contacto — vigia a ausência de acompanhamento. Corre a verificação ao
 * abrir a área e mostra o que aconteceu: 1.º aviso (+48h) ou reatribuição
 * automática (+24h do aviso). Guarda o momento do 1.º aviso em localStorage
 * para o fluxo funcionar mesmo em demo; o botão "Simular +24h" antecipa o 2.º
 * aviso para se ver a reatribuição sem esperar.
 */
export function ContactSlaWatcher({ agentId, demo }: { agentId: string; demo?: boolean }) {
  const key = `contactWarned:${agentId}`;
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [ran, setRan] = React.useState(false);

  const load = React.useCallback((): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
  }, [key]);

  const run = React.useCallback(async (warnedAt: Record<string, string>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/leads/contact-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ warnedAt }),
      });
      const data = await res.json();
      if (data?.ok) {
        setOutcomes((data.outcomes ?? []).filter((o: Outcome) => o.outcome !== "ok"));
        try { localStorage.setItem(key, JSON.stringify(data.warnedAt ?? {})); } catch {}
      }
    } catch {/* best-effort */} finally {
      setBusy(false); setRan(true);
    }
  }, [key]);

  React.useEffect(() => { run(load()); }, [run, load]);

  function simulate24h() {
    const cur = load();
    const back = new Date(Date.now() - (CONTACT_ESCALATION_HOURS * 3_600_000 + 60_000)).toISOString();
    const shifted: Record<string, string> = {};
    for (const id of Object.keys(cur)) shifted[id] = back;
    localStorage.setItem(key, JSON.stringify(shifted));
    run(shifted);
  }

  const warned = outcomes.filter((o) => o.outcome === "warned");
  const reassigned = outcomes.filter((o) => o.outcome === "reassigned");
  const something = warned.length > 0 || reassigned.length > 0;

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4 text-primary" /> SLA de contacto
          <span className="text-xs font-normal text-muted-foreground">
            aviso a +{CONTACT_SLA_HOURS}h · reatribuição a +{CONTACT_ESCALATION_HOURS}h do aviso
          </span>
        </p>
        <div className="flex items-center gap-2">
          {demo && Object.keys(load()).length > 0 && (
            <Button variant="ghost" size="sm" onClick={simulate24h} disabled={busy}>
              Simular +24h
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => run(load())} disabled={busy}>
            <RefreshCw className="size-3.5" /> Verificar
          </Button>
        </div>
      </div>

      {warned.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>{warned.length}</strong> contacto(s) sem resposta há +{CONTACT_SLA_HOURS}h — avisámos-te por app e email.
            Se não atenderes em {CONTACT_ESCALATION_HOURS}h, passa automaticamente a outro consultor: {warned.map((o) => o.name).join(", ")}.
          </span>
        </div>
      )}

      {reassigned.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>{reassigned.length}</strong> contacto(s) reatribuído(s) por ausência:{" "}
            {reassigned.map((o) => `${o.name} → ${o.toName}`).join("; ")}. O cliente foi informado com a opção de te manter.
          </span>
        </div>
      )}

      {ran && !something && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" /> Sem contactos em risco. Bom acompanhamento!
        </p>
      )}
    </div>
  );
}
