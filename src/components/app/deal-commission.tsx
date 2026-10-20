import { formatEuro } from "@/lib/format";
import { COMMISSION } from "@/lib/commission/config";
import type { DealCommissionEstimate } from "@/lib/commission/deal-estimate";
export function DealCommission({
  estimate,
  compact = false,
}: {
  estimate?: DealCommissionEstimate;
  compact?: boolean;
}) {
  if (!estimate)
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Repartição indisponível.
      </p>
    );
  return (
    <div
      className={
        compact
          ? "mt-3 space-y-2 rounded-xl bg-secondary/40 p-3 text-xs"
          : "mt-6 space-y-4 rounded-2xl border bg-card p-5 text-sm"
      }
    >
      <p className="font-medium">Comissão · estimativa</p>
      <dl className="space-y-1">
        <Line label="Bruta do negócio" amount={estimate.gross} />
        {estimate.externalShare > 0 && (
          <Line
            label="Partilha com outra agência"
            amount={-estimate.externalShare}
          />
        )}
      </dl>
      {estimate.status === "missing" ? (
        <p className="text-muted-foreground">{estimate.reason}</p>
      ) : (
        estimate.producers.map((p) => (
          <div key={p.id} className="space-y-1.5 border-t pt-2">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {p.name}
              {estimate.producers.length > 1
                ? ` · ${p.allocationPct}% da comissão interna`
                : ""}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Patamar {p.agentSplitPct.toFixed(0)}% · {p.companyValidated ? "com empresa" : "individual"}
              </span>
            </p>
            <dl className="space-y-1">
              <Line label="Comissão bruta do consultor" amount={p.agentGross} />
              <Line
                label={`Royalties · ${COMMISSION.royaltiesPct}%`}
                amount={-p.royalties}
              />
              <Line
                label={`Fundo de pensão · ${COMMISSION.pensionPct}%`}
                amount={-p.pension}
              />
              <Line
                label="Consultor após deduções"
                amount={p.agentNet}
                strong
              />
            </dl>
          </div>
        ))
      )}
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Projeção segundo o vínculo e a faturação acumulada registados. Não
          soma os outros negócios em aberto. O valor final depende da liquidação
          e das condições do ciclo.
        </p>
      )}
    </div>
  );
}
function Line({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: number | null;
  strong?: boolean;
}) {
  return (
    <div
      className={
        "flex items-start justify-between gap-3 " +
        (strong ? "border-t pt-2 font-semibold text-primary" : "")
      }
    >
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd className="shrink-0 tabular-nums">
        {amount == null ? "Por definir" : formatEuro(amount)}
      </dd>
    </div>
  );
}
