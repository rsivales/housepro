import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";

import { PublicShell } from "@/components/layout/public-shell";
import { FadeIn } from "@/components/motion/fade-in";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, getNewsById, newsImage, NEWS_FALLBACK } from "@/lib/data/news";
import { getCommentSettings, listArticleComments } from "@/lib/db/news-comments";
import { ArticleActions } from "@/components/news/article-actions";
import { ArticleComments } from "@/components/news/article-comments";
import { site, fullAddress } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsById(id);
  if (!item) return { title: "Notícia" };
  return { title: item.title, description: item.excerpt, alternates: { canonical: "/noticias/" + item.id }, openGraph: { title: item.title, description: item.excerpt, images: [newsImage(item)] } };
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
  const settings = await getCommentSettings();
  const comments = await listArticleComments(item.id);

  return (
    <PublicShell>
      <article className="news-article mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="news-print-brand" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/housepro-logo.png" alt="" />
          <span>GUIA HOUSEPRO · INFORMAÇÃO IMOBILIÁRIA</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="news-print-watermark" src="/brand/watermark-bird.png" alt="" aria-hidden="true" />
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

          <div className="mt-8 space-y-5 text-pretty text-[1.05rem] leading-relaxed text-[var(--hp-navy)]/90">
            {body.map((p, i) => <p key={i} className={i === 0 ? "font-semibold" : i === body.length - 1 ? "border-l-4 border-[var(--hp-red)] pl-4" : ""}>{p}</p>)}
          </div>
          <ArticleActions title={item.title} id={item.id} />

          {item.sources?.length ? <aside className="mt-9 rounded-xl border bg-black/[0.03] p-5 text-sm">
            <h2 className="font-semibold text-[var(--hp-navy)]">Fontes oficiais</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">{item.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[var(--hp-red-hover)] underline underline-offset-2">{s.label}</a></li>)}</ul>
          </aside> : null}
          <p className="mt-6 text-xs leading-relaxed text-[var(--hp-text-2)]">
            Análise informativa HousePro, revista em {formatDate(item.date)}. Regras e valores podem mudar. Confirme o seu caso com as entidades competentes e profissionais habilitados.
          </p>
        </FadeIn>

        <ArticleComments articleId={item.id} comments={comments} enabled={settings.enabled && !settings.disabled_article_ids.includes(item.id)} />

        <div className="news-print-footer" aria-hidden="true">HousePro · {site.legalName} · AMI {site.amiLicense} · {fullAddress} · {site.email.general} · housepro.pt</div>

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
