import type { Metadata } from "next";

import { PublicShell } from "@/components/layout/public-shell";
import { FadeIn } from "@/components/motion/fade-in";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, newsHref, isExternalNews, newsImage, NEWS_FALLBACK } from "@/lib/data/news";

export const metadata: Metadata = {
  title: "Notícias & mercado",
  description:
    "Notícias do mercado imobiliário, legislação, investimento e dicas — agregadas automaticamente pela HousePro.",
};

export default async function NoticiasPage() {
  const news = await getNews();

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <FadeIn>
          <p className="text-sm font-semibold text-[var(--hp-red-hover)]">
            Guia HousePro · mundo imobiliário
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--hp-navy)] sm:text-4xl">
            Notícias, mercado &amp; investimento
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--hp-text-2)]">
            Legislação, mercado, investimento, dicas e eventos — sem necessidade
            de redação manual.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {news.map((item, i) => (
            <FadeIn key={item.id} delay={(i % 3) * 0.08}>
              <a
                href={newsHref(item)}
                {...(isExternalNews(item)
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="relative">
                  <ArticleImage id={item.id} base={newsImage(item)} fallback={NEWS_FALLBACK} alt={item.title} className="aspect-[16/10] w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                    {item.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--hp-text-2)]">
                    <span className="font-medium text-[var(--hp-navy)]">{item.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.date).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-lg leading-snug text-[var(--hp-navy)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--hp-text-2)]">
                    {item.excerpt}
                  </p>
                  <span className="mt-auto pt-4 text-sm font-semibold text-[var(--hp-red-hover)]">
                    Ler artigo →
                  </span>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
