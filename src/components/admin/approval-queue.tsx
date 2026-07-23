"use client";

import * as React from "react";
import { Check, Clock, X, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PendingItem {
  id: string;
  reference: string;
  title: string;
  location: string;
  agentName: string;
  agencyName: string;
  submittedAt?: string;
  missingCount: number;
  missingLabels: string[];
}

/** SLA de 24/48h para a administração se pronunciar. */
function sla(submittedAt?: string): { label: string; tone: "ok" | "warn" | "late"; hours: number } {
  if (!submittedAt) return { label: "Sem data", tone: "warn", hours: 0 };
  const hours = (Date.now() - new Date(submittedAt).getTime()) / 36e5;
  if (hours <= 24) return { label: `Há ${Math.floor(hours)}h · dentro das 24h`, tone: "ok", hours };
  if (hours <= 48) return { label: `Há ${Math.floor(hours)}h · a expirar (48h)`, tone: "warn", hours };
  return { label: `Há ${Math.floor(hours)}h · FORA DO PRAZO (48h)`, tone: "late", hours };
}

export function ApprovalQueue({ items }: { items: PendingItem[] }) {
  const [state, setState] = React.useState<Record<string, "aprovado" | "rejeitado">>({});

  async function act(id: string, action: "approve" | "reject") {
    setState((s) => ({ ...s, [id]: action === "approve" ? "aprovado" : "rejeitado" }));
    try {
      await fetch("/api/properties/approve", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
    } catch {
      /* estado otimista mantém-se */
    }
  }

  const pending = items.filter((i) => !state[i.id]);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Nada a aguardar aprovação.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const decided = state[it.id];
        const s = sla(it.submittedAt);
        return (
          <div
            key={it.id}
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-sm",
              decided === "aprovado" && "border-primary/40 opacity-70",
              decided === "rejeitado" && "border-destructive/40 opacity-70",
              !decided && s.tone === "late" && "border-destructive/50"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{it.title}</p>
                <p className="text-sm text-muted-foreground">
                  {it.reference} · {it.location} · {it.agentName} ({it.agencyName})
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  s.tone === "ok" && "bg-success/15 text-success",
                  s.tone === "warn" && "bg-gold/15 text-gold-foreground",
                  s.tone === "late" && "bg-destructive/15 text-destructive"
                )}
              >
                <Clock className="size-3.5" /> {s.label}
              </span>
            </div>

            {it.missingCount > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {it.missingCount} documento(s) obrigatório(s) em falta: {it.missingLabels.join(", ")}
              </p>
            )}

            {decided ? (
              <p className={cn("mt-3 text-sm font-medium", decided === "aprovado" ? "text-primary" : "text-destructive")}>
                {decided === "aprovado" ? "Aprovado e publicado." : "Rejeitado — devolvido ao consultor."}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => act(it.id, "approve")}>
                  <Check className="size-4" /> Aprovar e publicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => act(it.id, "reject")}>
                  <X className="size-4" /> Rejeitar
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {pending.length === 0 && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">Todas as pendências foram tratadas.</p>
      )}
    </div>
  );
}
