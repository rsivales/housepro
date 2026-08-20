"use client";

import * as React from "react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { type Story, STORY_OPERATIONS } from "@/lib/data/stories";
import { cn } from "@/lib/utils";

/** Grelha de histórias reais com filtro por tipo de operação. */
export function StoriesGrid({ stories }: { stories: Story[] }) {
  const [filter, setFilter] = React.useState<string>("Todas");
  const shown = filter === "Todas" ? stories : stories.filter((s) => s.operation === filter);

  const filters = ["Todas", ...STORY_OPERATIONS];

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar histórias">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm font-medium transition-colors",
              filter === f
                ? "border-transparent bg-[var(--hp-navy)] text-white"
                : "bg-card text-foreground hover:bg-secondary"
            )}
            style={filter === f ? undefined : { borderColor: "var(--border)" }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {shown.map((s) => (
          <VideoTestimonial key={s.id} t={s} />
        ))}
      </div>
    </div>
  );
}
