import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/data/types";
import { initials } from "@/lib/format";

/**
 * Initials avatar for an agent. Real photos (Supabase Storage) drop in later;
 * the tinted initials keep agents visually present until then.
 */
export function AgentAvatar({
  agent,
  className,
}: {
  agent: Agent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-background",
        className
      )}
      style={{ backgroundColor: agent.accent }}
      aria-hidden="true"
    >
      {initials(agent.name)}
    </span>
  );
}
