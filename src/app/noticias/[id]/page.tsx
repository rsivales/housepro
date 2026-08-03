import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";
import { getNews, getNewsById } from "@/lib/data/news";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsById(id);
  if (!item) return { title: "Notícia" };
  return { title: item.title, description: item.excerpt };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getNewsById(id);
  if (!item) notFound();

  const outras = (await getNews()).filter((n) => n.id !== item.id).slice(0, 3);
  const body = item.body ?? [item.excerpt];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/noticias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Notícias
        </Link>

        <FadeIn>
          <article className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
              <Newspaper className="size-3.5" /> {item.category}
            </span>
            <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
              {item.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{item.source}</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> {formatDate(item.date)}
              </span>
            </div>

            <div
              className={`mt-6 aspect-[16/8] rounded-2xl bg-gradient-to-br ${item.tint}`}
            />

            <div className="mt-8 space-y-4 text-pretty text-[1.05rem] leading-relaxed text-foreground/90">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <p className="mt-8 rounded-xl border bg-secondary/30 p-4 text-xs text-muted-foreground">
              Conteúdo agregado do feed do setor a título informativo. Para
              aconselhamento sobre o seu caso concreto, fale com um consultor
              HousePro.
            </p>
          </article>
        </FadeIn>

        {outras.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl">Mais notícias</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {outras.map((n) => (
                <Link
                  key={n.id}
                  href={`/noticias/${n.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className={`aspect-[16/10] bg-gradient-to-br ${n.tint}`} />
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-xs font-medium text-primary">
                      {n.category}
                    </span>
                    <h3 className="mt-1 font-display text-base leading-snug">
                      {n.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
