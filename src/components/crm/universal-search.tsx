"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Loader2, Users, MessageSquare, Home, Megaphone } from "lucide-react";

import { SEARCH_KIND_LABEL, type SearchHit, type SearchKind } from "@/lib/data/search";

const ICON: Record<SearchKind, typeof Users> = {
  contact: Users,
  lead: MessageSquare,
  property: Home,
  campaign: Megaphone,
};

/**
 * Pesquisa universal — uma caixa que procura em contactos, leads, imóveis e
 * campanhas ao mesmo tempo (com debounce). Chama /api/search.
 */
export function UniversalSearch() {
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setHits((data.hits as SearchHit[]) ?? []);
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar contactos, leads, imóveis, campanhas…"
          className="input pl-9"
        />
        {busy && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-4 space-y-2">
        {hits.map((h) => {
          const Icon = ICON[h.kind];
          return (
            <Link
              key={`${h.kind}-${h.id}`}
              href={h.href}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/40"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{h.title}</p>
                {h.subtitle && <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                {SEARCH_KIND_LABEL[h.kind]}
              </span>
            </Link>
          );
        })}
        {q.trim().length >= 2 && !busy && hits.length === 0 && (
          <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nada encontrado para “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}
