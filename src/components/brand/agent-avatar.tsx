import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/data/types";
import { initials } from "@/lib/format";

/**
 * Agent avatar: real headshot when available, tinted initials otherwise.
 */
export function AgentAvatar({
  agent,
  className,
}: {
  agent: Agent;
  className?: string;
}) {
  if (agent.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={agent.photo}
        alt={agent.name}
        loading="lazy"
        className={cn(
          "size-9 shrink-0 rounded-full object-cover ring-2 ring-background",
          className
        )}
      />
    );
  }

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
