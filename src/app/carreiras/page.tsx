import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { PublicHeader } from "@/components/home/public-header";
import { PublicFooter } from "@/components/home/public-footer";
import { VacancyList } from "@/components/home/vacancy-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentField } from "@/components/forms/consent-field";
import { BENEFITS, CAREER_FAQ } from "@/lib/data/careers";

export const metadata: Metadata = {
  title: "Carreiras — HousePro",
  description:
    "O teu próximo capítulo pode começar connosco. Tecnologia, formação e uma equipa que cresce contigo. Vê as oportunidades na HousePro.",
  alternates: { canonical: "/carreiras" },
};

export default function CarreirasPage() {
  return (
    <div className="hp min-h-dvh bg-background">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section style={{ background: "var(--hp-navy)" }}>
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Carreiras</p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.05] text-white sm:text-5xl">
              O teu próximo capítulo pode começar connosco.
            </h1>
            <p className="mt-4 max-w-xl text-white/75">
              Tecnologia, formação e uma equipa que cresce contigo. Junta-te à HousePro e faz
              carreira no imobiliário com o apoio certo.
            </p>
            <a
              href="#oportunidades"
              className="hp-btn-red mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold"
            >
              Ver oportunidades <ArrowRight className="size-4" />
            </a>
          </div>
        </section>

        {/* Benefícios / modelo */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl">Porquê a HousePro</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border bg-card p-5 shadow-sm">
                <p className="font-display text-lg">{b.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Oportunidades */}
        <section id="oportunidades" className="scroll-mt-24 bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl sm:text-3xl">Oportunidades abertas</h2>
            <VacancyList />
          </div>
        </section>

        {/* Candidatura espontânea */}
        <section id="candidatura" className="scroll-mt-24">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl sm:text-3xl">Candidatura espontânea</h2>
            <p className="mt-2 text-muted-foreground">
              Não encontraste a vaga certa? Envia-nos o teu contacto — queremos conhecer-te.
            </p>
            <form className="mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-label="Candidatura espontânea">
              <input type="hidden" name="origin" value="carreiras" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-nome">Nome</Label>
                  <Input id="c-nome" name="nome" placeholder="O teu nome" autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-contacto">Contacto</Label>
                  <Input id="c-contacto" name="contacto" placeholder="Telemóvel ou email" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-zona">Zona de interesse</Label>
                  <Input id="c-zona" name="zona" placeholder="Algarve, Lisboa, Porto…" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-msg">Mensagem</Label>
                  <Input id="c-msg" name="mensagem" placeholder="Conta-nos um pouco sobre ti" />
                </div>
              </div>
              <div className="mt-4">
                <ConsentField id="rgpd-carreiras" />
              </div>
              <button
                type="submit"
                className="hp-btn-red mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold"
              >
                Enviar candidatura <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-card">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl sm:text-3xl">Perguntas frequentes</h2>
            <div className="mt-6 divide-y">
              {CAREER_FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-display text-lg marker:hidden">
                    {f.q}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
