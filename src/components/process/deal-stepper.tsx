import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CREDIT_STEPS,
  DEAL_STEPS,
  stagePercent,
  type CreditStage,
  type DealStage,
} from "@/lib/data/deal";

function statusOf(index: number, currentIndex: number) {
  if (index < currentIndex) return "done" as const;
  if (index === currentIndex) return "current" as const;
  return "pending" as const;
}

export function DealStepper({
  stage,
  creditStage,
}: {
  stage: DealStage;
  creditStage: CreditStage;
}) {
  const currentIndex = DEAL_STEPS.findIndex((s) => s.stage === stage);
  const percent = stagePercent(stage);
  const creditIndex = CREDIT_STEPS.findIndex((s) => s.stage === creditStage);
  const hasCredit = creditStage !== "sem_credito";

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Progresso do processo
          </p>
          <p className="font-display text-2xl">{percent}%</p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Transactional track */}
      <div>
        <p className="mb-4 text-sm font-medium text-primary">Via transacional</p>
        <ol className="relative space-y-5 border-l border-border pl-6">
          {DEAL_STEPS.map((step, i) => {
            const st = statusOf(i, currentIndex);
            return (
              <li key={step.stage} className="relative">
                <span
                  className={cn(
                    "absolute -left-[31px] grid size-6 place-items-center rounded-full ring-4 ring-background",
                    st === "done" && "bg-primary text-primary-foreground",
                    st === "current" && "bg-gold text-gold-foreground",
                    st === "pending" && "bg-secondary text-muted-foreground"
                  )}
                >
                  {st === "done" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <p
                  className={cn(
                    "text-sm font-medium",
                    st === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                  {st === "current" && (
                    <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold-foreground">
                      Em curso
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Credit track (parallel) */}
      {hasCredit && (
        <div>
          <p className="mb-3 text-sm font-medium text-primary">
            Crédito bancário <span className="text-muted-foreground">(em paralelo)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CREDIT_STEPS.map((step, i) => {
              const st = statusOf(i, creditIndex);
              return (
                <span
                  key={step.stage}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                    st === "done" && "bg-primary/10 text-primary",
                    st === "current" && "bg-gold/15 text-gold-foreground",
                    st === "pending" && "bg-secondary text-muted-foreground"
                  )}
                >
                  {st === "done" && <Check className="size-3" />}
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
