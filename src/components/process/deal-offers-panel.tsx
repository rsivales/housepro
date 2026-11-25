"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Handshake, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DealOffer } from "@/lib/db/deal-offers";

const STATUS_LABEL: Record<DealOffer["status"], string> = {
  pendente: "Pendente",
  aceite: "Aceite",
  recusada: "Recusada",
  substituida: "Substituída",
};
const STATUS_CLASS: Record<DealOffer["status"], string> = {
  pendente: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  aceite: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  recusada: "bg-destructive/15 text-destructive",
  substituida: "bg-secondary text-muted-foreground",
};
const currency = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Histórico de propostas/contrapropostas de um negócio, com registo de nova
 *  ronda e aceitar/recusar a pendente. Qualquer um dos dois agentes do
 *  negócio (angariador ou consultor comprador) pode agir — é a transparência
 *  que falta quando são duas pessoas de carteiras (ou agências) diferentes. */
export function DealOffersPanel({
  dealId,
  initialOffers,
  reference,
  canAct,
}: {
  dealId: string;
  initialOffers: DealOffer[];
  reference: string;
  canAct: boolean;
}) {
  const router = useRouter();
  const [offers, setOffers] = React.useState(initialOffers);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const pending = offers.find((o) => o.status === "pendente");
  const kindLabel = offers.length === 0 ? "Proposta" : "Contraproposta";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      setErr("Indique um valor válido.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/offers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: value, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error === "side_required" ? "Só o angariador ou o consultor comprador podem registar." : "Não foi possível registar.");
        return;
      }
      setOffers(data.offers ?? []);
      setAmount("");
      setNote("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function decide(offer: DealOffer, decision: "aceite" | "recusada") {
    setBusyId(offer.id);
    setErr(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr("Não foi possível atualizar a proposta.");
        return;
      }
      setOffers(data.offers ?? []);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Handshake className="size-5 text-primary" /> Registo de propostas
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{reference}</span>
      </div>

      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Ainda sem propostas registadas.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {offers.map((o) => (
            <li key={o.id} className="rounded-xl border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {o.kind === "proposta" ? "Proposta" : "Contraproposta"} · {currency(o.amount)}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASS[o.status])}>
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {o.side === "comprador" ? "Lado do comprador" : "Lado do vendedor"} · {o.createdByName} ·{" "}
                {new Date(o.createdAt).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}
              </p>
              {o.note && <p className="mt-2 whitespace-pre-wrap">{o.note}</p>}
              {canAct && o.status === "pendente" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === o.id}
                    onClick={() => decide(o, "aceite")}
                  >
                    {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Aceitar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === o.id}
                    onClick={() => decide(o, "recusada")}
                  >
                    <X className="size-4" /> Recusar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {canAct && !pending && (
        <form onSubmit={submit} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm">
            {kindLabel} (€)
            <input
              type="number"
              min={1}
              step="0.01"
              required
              disabled={busy}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Nota (opcional)
            <input
              maxLength={300}
              disabled={busy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Registar {kindLabel.toLowerCase()}
          </Button>
        </form>
      )}
      {canAct && pending && (
        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          Há uma ronda pendente — aceite ou recuse antes de registar a seguinte.
        </p>
      )}
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
    </div>
  );
}
