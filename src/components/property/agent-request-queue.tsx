"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentRequest } from "@/lib/db/agent-requests";

/** Fila de pedidos de co-angariação para o broker/coordenação aprovar/recusar. */
export function AgentRequestQueue({ initial }: { initial: AgentRequest[] }) {
  const [rows, setRows] = React.useState<AgentRequest[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(id: string, decision: "aprovado" | "recusado") {
    setBusy(id);
    try {
      const res = await fetch("/api/properties/agent-request/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: id, decision }),
      });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sem pedidos de angariação pendentes.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <p className="font-medium">
              {r.requesterName} <span className="text-muted-foreground">quer angariar</span>
            </p>
            <p className="text-sm text-muted-foreground">
              <Link href={`/imovel/${r.propertyId}`} className="text-primary hover:underline">{r.propertyRef}</Link>
              {r.propertyTitle ? ` · ${r.propertyTitle}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="brand" onClick={() => decide(r.id, "aprovado")} disabled={busy === r.id}>
              {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Aprovar
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide(r.id, "recusado")} disabled={busy === r.id}>
              <X className="size-4" /> Recusar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
