import { Check, Gift, MapPin, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { agentById } from "@/lib/data/mock";
import { REFERRAL_TRACK_STEPS, type TrackedReferral } from "@/lib/data/referrals";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Timeline (stepper) do acompanhamento de uma indicação, para quem referiu. */
export function ReferralTimeline({ tr }: { tr: TrackedReferral }) {
  const agent = tr.agentId ? agentById(tr.agentId) : undefined;
  const eventByStep = new Map(tr.events.map((e) => [e.step, e]));
  const done = tr.currentStep >= REFERRAL_TRACK_STEPS.length - 1;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <User className="size-4" /> Indicação de {tr.clientName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quer <strong className="text-foreground">{tr.purpose}</strong>
            {tr.zone && (
              <>
                {" · "}
                <MapPin className="mb-0.5 inline size-3.5" /> {tr.zone}
              </>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-primary/5 px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">A sua recompensa ({tr.sharePct}%)</p>
          <p className="font-display text-lg text-primary">
            {tr.estimatedReward ? `≈ ${formatEuro(tr.estimatedReward)}` : "quando fechar"}
          </p>
        </div>
      </div>

      {/* Consultor atribuído */}
      {agent && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border bg-secondary/40 p-3">
          <AgentAvatar agent={agent} className="size-10" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Atribuída ao consultor</p>
            <p className="font-medium">{agent.name}</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{tr.agencyName}</span>
        </div>
      )}

      {/* Stepper */}
      <ol className="mt-6 space-y-0">
        {REFERRAL_TRACK_STEPS.map((label, i) => {
          const state = i < tr.currentStep ? "done" : i === tr.currentStep ? "current" : "todo";
          const ev = eventByStep.get(i);
          const last = i === REFERRAL_TRACK_STEPS.length - 1;
          return (
            <li key={label} className="flex gap-3">
              {/* Marcador + linha */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                    state === "done" && "border-primary bg-primary text-primary-foreground",
                    state === "current" && "border-primary text-primary",
                    state === "todo" && "border-border text-muted-foreground"
                  )}
                >
                  {state === "done" ? <Check className="size-4" /> : i + 1}
                </span>
                {!last && (
                  <span
                    className={cn(
                      "my-0.5 w-0.5 flex-1",
                      i < tr.currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Conteúdo */}
              <div className={cn("pb-6", last && "pb-0")}>
                <p
                  className={cn(
                    "font-medium leading-tight",
                    state === "todo" && "text-muted-foreground"
                  )}
                >
                  {label}
                  {state === "current" && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      a decorrer
                    </span>
                  )}
                </p>
                {ev && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {fmtDate(ev.at)}
                    {ev.note && ` · ${ev.note}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {done && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
          <Gift className="size-4" /> Negócio concluído — a sua recompensa vai ser processada.
        </div>
      )}
    </div>
  );
}
