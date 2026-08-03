import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";
import { getNews, newsHref, isExternalNews } from "@/lib/data/news";

export const metadata: Metadata = {
  title: "Notícias & mercado",
  description:
    "Notícias do mercado imobiliário, legislação, investimento e dicas — agregadas automaticamente pela HousePro.",
};

export default async function NoticiasPage() {
  const news = await getNews();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-primary">
            Feed automático · mundo imobiliário
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">
            Notícias, mercado &amp; investimento
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
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
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className={`relative aspect-[16/10] bg-gradient-to-br ${item.tint}`}>
                  <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                    {item.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.date).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-lg leading-snug">
                    {item.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {item.excerpt}
                  </p>
                  <span className="mt-auto pt-4 text-sm font-medium text-primary">
                    Ler artigo →
                  </span>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
