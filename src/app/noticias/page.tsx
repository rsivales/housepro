import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { FadeIn } from "@/components/motion/fade-in";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, newsHref, isExternalNews, newsImage, NEWS_FALLBACK, newsCategories } from "@/lib/data/news";

export const metadata: Metadata = {
  title: "Notícias & mercado",
  description:
    "Notícias HousePro sobre legislação, arrendamento, mais-valias, mercado imobiliário e investimento. Análises com fontes oficiais e dicas práticas.",
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
            Análises práticas e atualizadas, com fontes identificadas e contexto para decidir com confiança.
          </p>
          <Link href="/subscrever?origem=noticias" className="mt-6 inline-flex rounded-full bg-[var(--hp-red)] px-6 py-3 font-semibold text-white transition hover:opacity-90">Receber o guia por email</Link>
        </FadeIn>

        {newsCategories.map(category => <section key={category} className="mt-12 border-t pt-8" aria-label={category}>
          <h2 className="font-display text-2xl font-semibold text-[var(--hp-navy)]">{category}</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
          {news.filter(item => item.category === category).map((item, i) => (
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
                  <h3 className="mt-2 font-display text-lg leading-snug text-[var(--hp-navy)]">
                    {item.title}
                  </h3>
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
        </section>)}
      </div>
    </PublicShell>
  );
}
