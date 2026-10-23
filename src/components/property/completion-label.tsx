import type { Property } from "@/lib/data/types";
import { completionLabel } from "@/lib/data/completion";
import { cn } from "@/lib/utils";

export function CompletionLabel({ property, className }: { property: Property; className?: string }) {
  const label = completionLabel(property);
  return label ? <p className={cn("text-sm font-semibold", className)}>{label}</p> : null;
}
