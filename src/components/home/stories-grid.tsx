"use client";

import * as React from "react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { type Story, shuffleStories, STORY_OPERATIONS } from "@/lib/data/stories";
import { cn } from "@/lib/utils";

function localityKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-PT").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function StoriesGrid({ stories }: { stories: Story[] }) {
  const [randomOrder] = React.useState(() => shuffleStories(stories));
  const [filter, setFilter] = React.useState("Todas");
  const [locality, setLocality] = React.useState("");
  const [order, setOrder] = React.useState("random");

  const localities = new Map<string, string>();
  for (const story of stories) {
    const key = localityKey(story.locality ?? "");
    if (key && !localities.has(key)) localities.set(key, story.locality.trim());
  }
  const ordered = order === "random" ? randomOrder : order === "recent"
    ? [...stories].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    : stories;
  const shown = ordered.filter((story) =>
    (filter === "Todas" || story.operation === filter) &&
    (!locality || localityKey(story.locality ?? "") === locality)
  );
  const filters = ["Todas", ...STORY_OPERATIONS];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-4">
        <label className="grid gap-1 text-sm">
          Localidade
          <select className="min-h-10 rounded-md border bg-card px-3" value={locality} onChange={(event) => setLocality(event.target.value)}>
            <option value="">Todas as localidades</option>
            {[...localities].sort((a, b) => a[1].localeCompare(b[1], "pt-PT")).map(([key, label]) =>
              <option key={key} value={key}>{label}</option>
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Ordenar por
          <select className="min-h-10 rounded-md border bg-card px-3" value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="random">Ordem aleatória</option>
            <option value="recent">Mais recentes primeiro</option>
            <option value="manual">Ordem HousePro</option>
          </select>
        </label>
      </div>
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

      {!shown.length && <p className="mt-8 text-sm text-muted-foreground">Sem testemunhos para estes filtros.</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {shown.map((s) => (
          <VideoTestimonial key={s.id} t={s} />
        ))}
      </div>
    </div>
  );
}
