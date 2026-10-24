import type { Property } from "@/lib/data/types";
import { completionLabel } from "@/lib/data/completion";
import { cn } from "@/lib/utils";

export function CompletionLabel({ property, className }: { property: Property; className?: string }) {
  const label = completionLabel(property);
  return label ? <p className={cn("inline-flex w-fit items-center rounded-[8px] border border-[#E00018]/20 bg-[#E00018]/10 px-2.5 py-1 text-sm font-bold text-[#E00018]", className)}>{label}</p> : null;
}
