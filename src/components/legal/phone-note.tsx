import { cn } from "@/lib/utils";

/**
 * Legal call-cost disclosure required in Portugal (ANACOM) whenever a phone
 * number is advertised. HousePro consultants use national mobile numbers.
 */
export function PhoneNote({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Chamada para rede móvel nacional
    </span>
  );
}
