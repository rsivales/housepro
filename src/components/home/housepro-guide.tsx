import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { type NewsItem, newsHref, isExternalNews } from "@/lib/data/news";

/**
 * "Guia HousePro" — informação que ajuda a decidir. 1 artigo em destaque +
 * até 3 compactos (miniatura à esquerda, categoria+título à direita).
 * Reutiliza o feed real de conteúdos (`news`). Aspeto consistente; nunca
 * um artigo sem imagem — na ausência de foto usa o gradiente da categoria.
 */
function articleProps(item: NewsItem) {
  return {
    href: newsHref(item),
    ...(isExternalNews(item) ? { target: "_blank" as const, rel: "noopener noreferrer" } : {}),
  };
}

export function HouseProGuide({ articles }: { articles: NewsItem[] }) {
  if (articles.length === 0) return null;
  const [featured, ...rest] = articles;
  const compact = rest.slice(0, 3);

  return (
    <section aria-labelledby="guide-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hp-eyebrow">Guia HousePro</p>
          <h2 id="guide-title" className="mt-1 font-display text-2xl sm:text-3xl">
            Informação que ajuda a decidir
          </h2>
        </div>
        <Link
          href="/noticias"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70"
        >
          Ver todos os artigos <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Artigo em destaque */}
        <Link
          {...articleProps(featured)}
          className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
        >
          <div className={`relative aspect-[16/9] bg-gradient-to-br ${featured.tint}`}>
            <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {featured.category}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-display text-xl leading-snug transition-colors group-hover:text-[var(--hp-navy)]">
              {featured.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{featured.excerpt}</p>
            <span className="mt-auto pt-4 text-sm font-semibold text-[var(--hp-navy)]">Ler artigo →</span>
          </div>
        </Link>

        {/* 3 compactos */}
        <ul className="flex flex-col gap-3">
          {compact.map((item) => (
            <li key={item.id}>
              <Link
                {...articleProps(item)}
                className="group flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className={`aspect-[4/3] w-24 shrink-0 rounded-xl bg-gradient-to-br ${item.tint}`} aria-hidden />
                <span className="min-w-0">
                  <span className="hp-eyebrow block text-[0.65rem]">{item.category}</span>
                  <span className="mt-0.5 line-clamp-2 font-display text-sm leading-snug transition-colors group-hover:text-[var(--hp-navy)]">
                    {item.title}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
