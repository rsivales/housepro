import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";

import { PublicShell } from "@/components/layout/public-shell";
import { FadeIn } from "@/components/motion/fade-in";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, getNewsById, newsImage, NEWS_FALLBACK } from "@/lib/data/news";

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
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
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
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/noticias" className="inline-flex items-center gap-1.5 text-sm text-[var(--hp-text-2)] transition-colors hover:text-[var(--hp-navy)]">
          <ArrowLeft className="size-4" /> Guia HousePro
        </Link>

        <FadeIn>
          <header className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hp-red)]/10 px-3 py-1 text-xs font-semibold text-[var(--hp-red-hover)]">
              <Newspaper className="size-3.5" /> {item.category}
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-[var(--hp-navy)] sm:text-4xl">
              {item.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--hp-text-2)]">
              <span className="font-medium text-[var(--hp-navy)]">{item.source}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> {formatDate(item.date)}</span>
            </div>
          </header>

          {/* Capa real (mesma imagem da homepage; substituível no admin). */}
          <div className="mt-6 overflow-hidden rounded-2xl">
            <ArticleImage
              id={item.id}
              base={newsImage(item)}
              fallback={NEWS_FALLBACK}
              alt={item.title}
              className="aspect-[16/8] w-full object-cover"
            />
          </div>

          <div className="mt-8 space-y-4 text-pretty text-[1.05rem] leading-relaxed text-[var(--hp-navy)]/90">
            {body.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          <p className="mt-8 rounded-xl border bg-black/[0.03] p-4 text-xs text-[var(--hp-text-2)]">
            Conteúdo agregado do feed do setor a título informativo. Para aconselhamento
            sobre o seu caso concreto, fale com um consultor HousePro.
          </p>
        </FadeIn>

        {outras.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl text-[var(--hp-navy)]">Mais no Guia HousePro</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {outras.map((n) => (
                <Link key={n.id} href={`/noticias/${n.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm transition-shadow hover:shadow-lg">
                  <ArticleImage id={n.id} base={newsImage(n)} fallback={NEWS_FALLBACK} alt={n.title} className="aspect-[16/10] w-full object-cover" />
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-xs font-semibold text-[var(--hp-red-hover)]">{n.category}</span>
                    <h3 className="mt-1 font-display text-base leading-snug text-[var(--hp-navy)]">{n.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </PublicShell>
  );
}
