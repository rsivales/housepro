"use client";

import * as React from "react";
import { CheckCircle2, Handshake } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import type { OverridePayout } from "@/lib/commission/override-chain";

/**
 * Gatilho de fecho de negócio (coordenação/admin). Ao concluir, chama o motor:
 * credita a faturação do produtor, distribui o override pela rede de padrinhos
 * e notifica cada um. Fecha o ciclo dos afilhados a partir do processo real.
 */
export function DealCloseTrigger({
  dealRef, producerId, producerName, amount, commissionPct = 5, alreadyClosed,
}: {
  dealRef: string;
  producerId: string;
  producerName: string;
  amount: number;
  commissionPct?: number;
  alreadyClosed?: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(alreadyClosed ?? false);
  const [result, setResult] = React.useState<
    | { gross: number; producerNet: number; producerNetPct: number; payouts: OverridePayout[]; notified: number }
    | null
  >(null);

  async function close() {
    setLoading(true);
    try {
      const res = await fetch("/api/deals/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ producerId, producerName, amount, commissionPct, dealRef }),
      });
      const out = await res.json();
      if (res.ok && out.ok) { setResult(out); setDone(true); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-medium">
        <Handshake className="size-4 text-primary" /> Fecho do negócio
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ao concluir a escritura, a comissão entra na faturação de {producerName} e
        o override é distribuído pela rede, com notificação a cada padrinho.
      </p>

      {!done ? (
        <Button className="mt-3" onClick={close} disabled={loading}>
          {loading ? "A processar…" : "Concluir e distribuir"}
        </Button>
      ) : (
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" /> Negócio concluído
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-1.5 rounded-xl border bg-secondary/30 p-4 text-sm">
          <Row label="Comissão bruta" value={formatEuro(result.gross)} />
          <Row label={`Produtor · ${result.producerNetPct}%`} value={formatEuro(result.producerNet)} />
          {result.payouts.filter((p) => p.amount > 0).map((p) => (
            <Row key={p.level} label={`Override nível ${p.level} · ${p.agentName ?? p.agentId} · ${p.pct}%`} value={`+${formatEuro(p.amount)}`} />
          ))}
          <p className="pt-1 text-xs text-muted-foreground">{result.notified} notificação(ões) enviada(s).</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display tabular-nums">{value}</span>
    </div>
  );
}
