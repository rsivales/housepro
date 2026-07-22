"use client";

import { Percent } from "lucide-react";

import { cn } from "@/lib/utils";
import { useClientMode } from "@/lib/client-mode";
import { commissionLabel, type CommissionInput } from "@/lib/data/commission";

/**
 * Mostra a comissão em vigor ao consultor. Some por completo em "modo cliente"
 * (e nunca renderiza no servidor, para não vazar antes de saber o modo).
 */
export function CommissionInfo({
  price,
  commission,
  variant = "pill",
}: {
  price: number;
  commission: CommissionInput;
  variant?: "pill" | "badge";
}) {
  const { ready, clientMode } = useClientMode();
  if (!ready || clientMode) return null;
  if (!commission.commissionPct && !commission.commissionFixed) return null;

  const label = commissionLabel(price, commission);

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
        <Percent className="size-3" /> {label}
      </span>
    );
  }
  return (
    <div className={cn("rounded-lg bg-secondary/60 px-3 py-2 text-sm")}>
      <span className="text-muted-foreground">Comissão em vigor · </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
