"use client";

import * as React from "react";
import { MessageSquareWarning, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

const REASONS: { value: string; label: string }[] = [
  { value: "atraso", label: "Espera demasiado longa / sem resposta" },
  { value: "reclamacao", label: "Reclamação sobre o atendimento" },
  { value: "abandono", label: "Deixei de ter acompanhamento" },
  { value: "procedimento", label: "Algo não correu como combinado" },
];

/**
 * Portal do cliente → Qualidade. O cliente reporta uma ocorrência sobre o
 * acompanhamento. Não pune ninguém: entra na fila de análise da Qualidade, que
 * decide. Transparente e com garantia de que é revisto por pessoas.
 */
export function ReportQuality({ consultantId, clientName }: { consultantId: string; clientName?: string }) {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState("atraso");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quality/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: consultantId, category, reason: reason.trim(), submittedBy: clientName ? `${clientName} (cliente)` : "Cliente (portal)" }),
      });
      if (res.ok) { setSent(true); setReason(""); }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-primary/5 p-5 text-sm">
        <p className="font-medium text-foreground">Obrigado — a sua mensagem foi registada.</p>
        <p className="mt-1 text-muted-foreground">
          A equipa de Qualidade da HousePro vai analisar. Damos-lhe retorno e garantimos
          acompanhamento. Nada é decidido de forma automática.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          <MessageSquareWarning className="size-4 text-primary" /> Reportar um problema no acompanhamento
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Fechar" : "Abrir"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            A sua opinião ajuda-nos a melhorar. É revista pela <strong>Qualidade</strong> da
            HousePro — não afeta ninguém automaticamente.
          </p>
          <select className={box} value={category} onChange={(e) => setCategory(e.target.value)}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <textarea
            className={cn(box, "min-h-20 resize-y")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Conte-nos o que aconteceu…"
          />
          <Button size="sm" disabled={busy || !reason.trim()} onClick={submit}>
            <Send className="size-3.5" /> {busy ? "A enviar…" : "Enviar à Qualidade"}
          </Button>
        </div>
      )}
    </div>
  );
}
