import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SafeImage } from "@/components/home/safe-image";
import { type NewsItem, newsHref, isExternalNews, newsImage, NEWS_FALLBACK } from "@/lib/data/news";

/**
 * "Guia HousePro" — informação que ajuda a decidir. 1 artigo em destaque
 * (imagem 16:9, altura controlada) + 3 compactos (miniatura + categoria/título).
 * Imagens reais com prioridade de fallback (featuredImage → imagem → categoria
 * → geral) e troca imediata em erro. Nunca cinzento no estado final.
 */
function articleLinkProps(item: NewsItem) {
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
      <p className="hp-eyebrow">Guia HousePro</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h2 id="guide-title" className="font-display text-2xl sm:text-3xl">
          Informação que ajuda a decidir
        </h2>
        <Link href="/noticias" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70">
          Ver todos os artigos <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Artigo em destaque — imagem 16:9 com altura controlada */}
        <Link {...articleLinkProps(featured)} className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg">
          <div className="relative aspect-[16/9] max-h-[230px] w-full overflow-hidden">
            <SafeImage
              src={newsImage(featured)}
              fallback={NEWS_FALLBACK}
              alt={featured.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {featured.category}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="line-clamp-3 font-display text-lg leading-snug transition-colors group-hover:text-[var(--hp-navy)]">
              {featured.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{featured.excerpt}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)]">
              Ler artigo <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* 3 compactos — miniatura + categoria/título */}
        <ul className="flex flex-col gap-3">
          {compact.map((item) => (
            <li key={item.id}>
              <Link {...articleLinkProps(item)} className="group flex min-h-[100px] items-center gap-4 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                <span className="relative size-[92px] shrink-0 overflow-hidden rounded-xl">
                  <SafeImage
                    src={newsImage(item)}
                    fallback={NEWS_FALLBACK}
                    alt={item.title}
                    className="absolute inset-0 size-full object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="hp-eyebrow block text-[0.65rem]">{item.category}</span>
                  <span className="mt-1 line-clamp-2 font-display text-sm leading-snug transition-colors group-hover:text-[var(--hp-navy)]">
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
