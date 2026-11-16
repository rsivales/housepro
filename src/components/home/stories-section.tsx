"use client";

import * as React from "react";

import { StoriesGrid } from "@/components/home/stories-grid";
import { publishedStories, type Story } from "@/lib/data/stories";
import { loadSiteContent, readStories } from "@/lib/data/site-content";

/**
 * Página "Histórias reais": lê as histórias geridas no admin (como a secção da
 * homepage). Só mostra histórias publicadas com consentimento; caso contrário,
 * o estado de preparação — nunca conteúdos fictícios.
 */
export function StoriesSection() {
  const [stories, setStories] = React.useState<Story[] | null>(null);

  React.useEffect(() => {
    loadSiteContent().then((c) => setStories(publishedStories(c.stories ?? readStories())));
  }, []);

  if (stories === null) return <div className="min-h-[320px]" aria-busy="true" />;

  if (stories.length === 0) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <h2 className="font-display text-xl sm:text-2xl">Histórias reais, em preparação</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Estamos a reunir testemunhos verdadeiros, com autorização de quem os viveu. Não
          publicamos histórias, nomes ou fotografias fictícias.
        </p>
      </div>
    );
  }

  return (
    <>
      <StoriesGrid stories={stories} />
      <p className="mt-8 text-xs text-muted-foreground">
        Respeitamos a privacidade: não são apresentados documentos, valores não autorizados,
        moradas completas ou imagens sem consentimento.
      </p>
    </>
  );
}
