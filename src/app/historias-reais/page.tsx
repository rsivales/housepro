import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicHeader } from "@/components/home/public-header";
import { PublicFooter } from "@/components/home/public-footer";
import { StoriesGrid } from "@/components/home/stories-grid";
import { publishedStories } from "@/lib/data/stories";

export const metadata: Metadata = {
  title: "Histórias reais — HousePro",
  description:
    "A nossa melhor prova são as pessoas. Testemunhos reais de quem comprou, vendeu ou investiu com a HousePro.",
  alternates: { canonical: "/historias-reais" },
};

export default function HistoriasReaisPage() {
  const stories = publishedStories();
  return (
    <div className="hp min-h-dvh bg-background">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section style={{ background: "var(--hp-navy)" }}>
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Histórias reais</p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.05] text-white sm:text-5xl">
              A nossa melhor prova são as pessoas.
            </h1>
            <p className="mt-4 max-w-xl text-white/75">
              Partilhamos apenas histórias verdadeiras, com o consentimento de quem as viveu.
            </p>
          </div>
        </section>

        {/* Grelha com filtros — ou estado de preparação, sem conteúdos fictícios */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          {stories.length > 0 ? (
            <>
              <StoriesGrid stories={stories} />
              <p className="mt-8 text-xs text-muted-foreground">
                Respeitamos a privacidade: não são apresentados documentos, valores não autorizados,
                moradas completas ou imagens sem consentimento.
              </p>
            </>
          ) : (
            <div className="rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-12">
              <h2 className="font-display text-xl sm:text-2xl">Histórias reais, em preparação</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Estamos a reunir testemunhos verdadeiros, com autorização de quem os viveu. Não
                publicamos histórias, nomes ou fotografias fictícias.
              </p>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="font-display text-xl sm:text-2xl">Quer ser a próxima história?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fale com um consultor que escuta o que procura.</p>
            </div>
            <Link
              href="/#contacto"
              className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold"
            >
              Falar com um consultor <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
