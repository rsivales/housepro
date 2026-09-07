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
    <div className="hp min-h-dvh bg-[#f5f8fc] text-[#0b1f3a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackPageView />
      <ValuationHeader />

      <main>
        {/* HERO */}
        <section className="relative isolate min-h-[610px] overflow-hidden sm:min-h-[650px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="Proprietários a receber a avaliação de uma consultora HousePro numa casa com vista mar." className="absolute inset-0 -z-10 size-full object-cover" style={{ objectPosition: "72% 50%" }} fetchPriority="high" width={1920} height={1080} />
          <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(90deg, rgba(4,25,52,.98) 0%, rgba(6,35,69,.91) 38%, rgba(6,35,69,.42) 72%, rgba(6,35,69,.2) 100%)" }} aria-hidden />
          <div className="mx-auto max-w-6xl px-5 pb-44 pt-12 sm:px-8 sm:pb-48 sm:pt-16">
            <div className="max-w-xl text-white">
              <span className="inline-block rounded-full border border-[#70b9ef]/70 bg-[#2876ad]/25 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.06em]">Avaliação profissional · Gratuita</span>
              <h1 className="mt-5 max-w-lg font-display text-[2.55rem] leading-[1.08] tracking-[-0.035em] sm:text-[3.4rem]">Descubra quanto vale a sua casa hoje.</h1>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/90">Receba uma análise personalizada, baseada no mercado real da sua zona — sem compromisso.</p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
                {["Análise local", "Dados comparáveis", "Acompanhamento humano"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#75bdf0] text-[#082544]"><Check className="size-3.5" strokeWidth={3} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-7">
                <a href="#comecar" className="hp-btn-red inline-flex min-h-[54px] items-center gap-5 rounded-xl px-7 text-base font-bold shadow-lg">Começar avaliação <ArrowRight className="size-5" /></a>
                <a href="#como-funciona" className="inline-flex items-center gap-2 text-base font-semibold text-white underline underline-offset-4">Como funciona? <ArrowRight className="size-4" /></a>
              </div>
            </div>
          </div>
        </section>

        {/* FORMULÁRIO (3 etapas) */}
        <section id="comecar" className="scroll-mt-16">
          <div className="relative z-10 mx-auto -mt-[170px] max-w-4xl px-4 sm:px-6">
            <ValuationForm />
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-14">
          <p className="hp-eyebrow text-center">O que vai receber</p>
          <h2 className="mt-1 text-center font-display text-2xl sm:text-3xl">Muito mais do que um número.</h2>
          <div className="mt-8 grid gap-7 sm:grid-cols-3 sm:divide-x sm:divide-[#dce5ef]">
            {[
              { icon: LineChart, t: "Valor de mercado", d: "Baseado em imóveis comparáveis e no conhecimento da sua zona." },
              { icon: Camera, t: "Estratégia de venda", d: "Posicionamento, fotografia, vídeo e divulgação profissional." },
              { icon: Users, t: "Plano acompanhado", d: "Do primeiro contacto à negociação e escritura." },
            ].map((b) => (
              <div key={b.t} className="flex gap-4 sm:px-5 first:pl-0 last:pr-0">
                <b.icon className="mt-1 size-10 shrink-0 stroke-[1.45] text-[#0b315b]" />
                <div><h3 className="font-display text-base">{b.t}</h3><p className="mt-1 text-sm leading-5 text-[#526174]">{b.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-16 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-2xl border border-[#e1e8f0] bg-white px-6 py-9 shadow-[0_12px_40px_-30px_rgba(11,31,58,.35)] sm:px-10">
            <p className="hp-eyebrow text-center">Como funciona</p>
            <h2 className="mt-1 text-center font-display text-2xl sm:text-3xl">Simples, transparente e sem compromisso.</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {[
                { n: 1, icon: HomeIcon, t: "Conte-nos sobre o imóvel" },
                { n: 2, icon: BarChart3, t: "Analisamos o mercado da zona" },
                { n: 3, icon: UserRound, t: "Receba a avaliação de um consultor" },
              ].map((s) => (
                <li key={s.n} className="flex flex-col items-center gap-2 text-center">
                  <span className="grid size-9 place-items-center rounded-full bg-[#0b315b] text-sm font-bold text-white">{s.n}</span>
                  <s.icon className="size-10 stroke-[1.4] text-[#0b315b]" />
                  <p className="max-w-[150px] text-sm font-medium leading-5">{s.t}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TESTEMUNHOS (oculto se não houver reais) */}
        <ValuationTestimonials />

        {/* BLOCO HUMANO */}
        <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="relative grid min-h-[190px] items-stretch overflow-hidden rounded-2xl bg-gradient-to-r from-[#071d37] to-[#123f6d] sm:grid-cols-[210px_1fr]">
            <div className="relative min-h-[210px] sm:min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agents/ana.jpg" alt="Consultora HousePro" className="absolute inset-0 size-full object-cover" />
            </div>
            <div className="relative z-10 flex flex-col justify-center p-7 text-white sm:p-10">
              <h2 className="max-w-lg font-display text-xl leading-snug sm:text-2xl">A sua casa merece uma avaliação feita por quem conhece o mercado local.</h2>
              <Link href="/historias-reais" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white underline underline-offset-4">Conheça a nossa forma de trabalhar <ArrowRight className="size-4" /></Link>
              <HomeIcon className="absolute -bottom-8 -right-5 size-44 stroke-[.55] text-white/10" aria-hidden />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 mx-auto max-w-4xl px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
          <p className="hp-eyebrow">Antes de pedir a avaliação</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#dce5ef] bg-white divide-y divide-[#dce5ef]">
            {FAQ.slice(0, 3).map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base marker:hidden"><span>{f.q}</span><span className="text-xl transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="sr-only">
            <p><strong className="text-foreground">O que é uma avaliação de mercado?</strong> É a estimativa do valor a que o seu imóvel se transaciona hoje, com base em imóveis comparáveis e na procura na sua zona.</p>
            <p><strong className="text-foreground">O que influencia o valor?</strong> A localização, a tipologia e área, o estado de conservação, a exposição solar, os acabamentos e a dinâmica do mercado local. Uma boa estratégia de venda — posicionamento, fotografia e divulgação — também protege o valor final.</p>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071d37] to-[#123f6d] px-7 py-9 text-white sm:px-12">
            <h2 className="font-display text-2xl sm:text-3xl">Pronto para saber o valor real?</h2>
            <a href="#comecar" className="hp-btn-red mt-5 inline-flex min-h-[52px] items-center gap-7 rounded-xl px-8 text-base font-bold shadow-lg">Avaliar a minha casa <ArrowRight className="size-5" /></a>
            <p className="mt-3 text-sm text-white/80">Gratuito · Confidencial · Sem compromisso</p>
            <HomeIcon className="absolute -bottom-12 right-4 size-52 stroke-[.55] text-white/10" aria-hidden />
          </div>
        </section>
      </main>

      <ValuationFooter />
    </div>
  );
}
