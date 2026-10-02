"use client";

import * as React from "react";
import { Check, Clock, Loader2, UserPlus } from "lucide-react";

type Status = "pendente" | "aprovado" | "recusado" | null;

/** Botão para um consultor pedir para entrar (co-angariar) num imóvel que não é
 *  seu. Fica pendente até o broker/coordenação aprovar. */
export function AgentRequestButton({
  propertyId,
  initialStatus,
}: {
  propertyId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(false);

  async function request() {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/properties/agent-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      if (res.ok) setStatus("pendente");
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  if (status === "pendente") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm font-medium text-[var(--hp-text-2)]">
        <Clock className="size-4 text-amber-600" /> Pedido de angariação enviado — a aguardar aprovação
      </span>
    );
  }
  if (status === "aprovado") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm font-medium text-emerald-700">
        <Check className="size-4" /> Já é co-angariador deste imóvel
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={request}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-black/[0.03]"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4 text-[var(--hp-red)]" />}
        Pedir para angariar
      </button>
      {status === "recusado" && <span className="text-xs text-[var(--hp-text-2)]">Pedido anterior recusado — pode voltar a pedir.</span>}
      {err && <span className="text-xs text-destructive">Não foi possível enviar. Tente novamente.</span>}
    </div>
  );
}
