import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, LineChart, Camera, Users, Home as HomeIcon, BarChart3, UserRound } from "lucide-react";

import { ValuationHeader } from "@/components/avaliacao/valuation-header";
import { ValuationForm } from "@/components/avaliacao/valuation-form";
import { ValuationTestimonials } from "@/components/avaliacao/valuation-testimonials";
import { ValuationFooter } from "@/components/avaliacao/valuation-footer";
import { TrackPageView } from "@/components/avaliacao/track-page-view";
import { site, postalAddressJsonLd } from "@/lib/site";

const HERO_IMG = "/home/banner-familia.webp";
const canonical = "/avaliacao-imovel";

export const metadata: Metadata = {
  title: "Avaliação de imóvel gratuita — Descubra quanto vale a sua casa | HousePro",
  description:
    "Peça uma avaliação de imóvel gratuita e sem compromisso. Análise baseada no mercado real da sua zona, com dados comparáveis e acompanhamento de um consultor HousePro.",
  keywords: [
    "avaliação de imóvel", "quanto vale a minha casa", "avaliação gratuita casa",
    "avaliar imóvel", "valor de mercado imóvel", "avaliação imobiliária Faro",
  ],
  alternates: { canonical },
  openGraph: {
    title: "Descubra quanto vale a sua casa hoje — HousePro",
    description: "Avaliação gratuita e sem compromisso, baseada no mercado real da sua zona.",
    type: "website",
    locale: "pt_PT",
    images: [{ url: HERO_IMG }],
  },
};

const FAQ = [
  { q: "A avaliação é mesmo gratuita?", a: "Sim. A avaliação de mercado da HousePro é gratuita e sem qualquer compromisso de colocar o imóvel à venda." },
  { q: "Como é calculado o valor?", a: "Analisamos imóveis comparáveis na sua zona, as características do seu imóvel e a dinâmica atual do mercado local. O consultor explica-lhe como chegou ao valor." },
  { q: "Tenho de colocar o imóvel à venda?", a: "Não. Muitos proprietários pedem a avaliação apenas para conhecer o valor. Não há qualquer obrigação." },
  { q: "A avaliação é igual a uma avaliação bancária?", a: "Não. A avaliação de mercado estima o valor a que o imóvel se transaciona na prática; a avaliação bancária serve para efeitos de crédito e segue critérios próprios do banco." },
  { q: "Que dados preciso de fornecer?", a: "Apenas o essencial: localização, tipo e estado do imóvel, algumas características e um contacto para o consultor lhe entregar a análise." },
  { q: "Quanto tempo demora?", a: "O pedido demora cerca de um minuto. Um consultor entra em contacto para combinar os próximos passos assim que possível." },
  { q: "Os meus dados são partilhados?", a: "Os seus dados são tratados apenas para responder ao pedido, nos termos da Política de Privacidade (RGPD). O consentimento de marketing é separado e opcional." },
];

export default function AvaliacaoImovelPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.brand,
      legalName: site.legalName,
      url: `${site.url}${canonical}`,
      address: postalAddressJsonLd,
      email: site.email.general,
      areaServed: ["Algarve", "Faro", "Portugal"],
      slogan: "Descubra quanto vale a sua casa hoje.",
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: `${site.brand} — ${site.legalName}`,
      address: postalAddressJsonLd,
      email: site.email.general,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: site.url },
        { "@type": "ListItem", position: 2, name: "Avaliação de imóvel", item: `${site.url}${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="hp min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackPageView />
      <ValuationHeader />

      <main>
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="Proprietários a receber a avaliação de uma consultora HousePro numa casa com vista mar." className="absolute inset-0 -z-10 size-full object-cover" style={{ objectPosition: "72% 50%" }} fetchPriority="high" width={1920} height={1080} />
          <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(100deg, rgba(11,31,58,0.94) 0%, rgba(11,31,58,0.75) 45%, rgba(11,31,58,0.4) 100%)" }} aria-hidden />
          <div className="mx-auto max-w-5xl px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
            <div className="max-w-xl text-white">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">Avaliação profissional · Gratuita</span>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">Descubra quanto vale a sua casa hoje.</h1>
              <p className="mt-4 max-w-md text-base text-white/85 sm:text-lg">Receba uma análise personalizada, baseada no mercado real da sua zona — sem compromisso.</p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {["Análise local", "Dados comparáveis", "Acompanhamento humano"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check className="size-4" style={{ color: "var(--hp-blue)" }} /> {t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a href="#comecar" className="hp-btn-red inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg">Começar avaliação <ArrowRight className="size-4" /></a>
                <a href="#como-funciona" className="text-sm font-semibold text-white underline-offset-4 hover:underline">Como funciona? ›</a>
              </div>
            </div>
          </div>
        </section>

        {/* FORMULÁRIO (3 etapas) */}
        <section id="comecar" className="scroll-mt-16">
          <div className="mx-auto -mt-6 max-w-3xl px-4 sm:-mt-8 sm:px-6">
            <ValuationForm />
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="hp-eyebrow text-center">O que vai receber</p>
          <h2 className="mt-1 text-center font-display text-2xl sm:text-3xl">Muito mais do que um número.</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: LineChart, t: "Valor de mercado", d: "Baseado em imóveis comparáveis e no conhecimento da sua zona." },
              { icon: Camera, t: "Estratégia de venda", d: "Posicionamento, fotografia, vídeo e divulgação profissional." },
              { icon: Users, t: "Plano acompanhado", d: "Do primeiro contacto à negociação e escritura." },
            ].map((b) => (
              <div key={b.t}>
                <span className="grid size-11 place-items-center rounded-xl" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}><b.icon className="size-5" /></span>
                <h3 className="mt-3 font-display text-lg">{b.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-16 bg-[var(--card)]">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="hp-eyebrow text-center">Como funciona</p>
            <h2 className="mt-1 text-center font-display text-2xl sm:text-3xl">Simples, transparente e sem compromisso.</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                { n: 1, icon: HomeIcon, t: "Conte-nos sobre o imóvel" },
                { n: 2, icon: BarChart3, t: "Analisamos o mercado da zona" },
                { n: 3, icon: UserRound, t: "Receba a avaliação de um consultor" },
              ].map((s) => (
                <li key={s.n} className="flex flex-col items-center gap-2 text-center">
                  <span className="grid size-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: "var(--hp-navy)" }}>{s.n}</span>
                  <s.icon className="size-7" style={{ color: "var(--hp-navy)" }} />
                  <p className="text-sm font-medium">{s.t}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TESTEMUNHOS (oculto se não houver reais) */}
        <ValuationTestimonials />

        {/* BLOCO HUMANO */}
        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="grid items-stretch overflow-hidden rounded-2xl sm:grid-cols-[0.9fr_1.4fr]" style={{ background: "var(--hp-navy)" }}>
            <div className="relative min-h-[180px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agents/ana.jpg" alt="Consultora HousePro" className="absolute inset-0 size-full object-cover" loading="lazy" />
            </div>
            <div className="p-6 text-white sm:p-8">
              <h2 className="font-display text-xl leading-snug sm:text-2xl">A sua casa merece uma avaliação feita por quem conhece o mercado local.</h2>
              <Link href="/historias-reais" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-4 hover:underline">Conheça a nossa forma de trabalhar ›</Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 mx-auto max-w-3xl px-4 pb-12 sm:px-6 sm:pb-16">
          <p className="hp-eyebrow">Antes de pedir a avaliação</p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl">Perguntas frequentes</h2>
          <div className="mt-6 divide-y" style={{ borderColor: "var(--border)" }}>
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-display text-base marker:hidden sm:text-lg">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>

          {/* Conteúdo contextual (SEO, curto) */}
          <div className="mt-8 space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">O que é uma avaliação de mercado?</strong> É a estimativa do valor a que o seu imóvel se transaciona hoje, com base em imóveis comparáveis e na procura na sua zona.</p>
            <p><strong className="text-foreground">O que influencia o valor?</strong> A localização, a tipologia e área, o estado de conservação, a exposição solar, os acabamentos e a dinâmica do mercado local. Uma boa estratégia de venda — posicionamento, fotografia e divulgação — também protege o valor final.</p>
          </div>
        </section>

        {/* CTA FINAL */}
        <section style={{ background: "var(--hp-navy)" }}>
          <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="font-display text-2xl text-white sm:text-3xl">Pronto para saber o valor real?</h2>
            <a href="#comecar" className="hp-btn-red mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg">Avaliar a minha casa <ArrowRight className="size-4" /></a>
            <p className="mt-3 text-sm text-white/70">Gratuito · Confidencial · Sem compromisso</p>
          </div>
        </section>
      </main>

      <ValuationFooter />
    </div>
  );
}
