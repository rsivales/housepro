import { cn } from "@/lib/utils";
import { PROPERTY_BADGE_STYLE, SIGNATURE_BADGE_STYLE, STATUS_LABEL, STATUS_STYLE } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";

/** Etiquetas comerciais e editoriais com o mesmo acabamento em toda a montra. */
export function PropertyBadges({ status, isSignature, className }: {
  status?: PropertyStatus | null;
  isSignature?: boolean;
  className?: string;
}) {
  if (!status && !isSignature) return null;
  return (
    <div className={cn("flex flex-wrap items-start gap-2", className)}>
      {status && <span className={cn("px-2.5 py-1 text-xs", PROPERTY_BADGE_STYLE, STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>}
      {isSignature && <span className={cn("px-2.5 py-1 text-xs tracking-wide", PROPERTY_BADGE_STYLE, SIGNATURE_BADGE_STYLE)}>SIGNATURE</span>}
    </div>
  );
}
