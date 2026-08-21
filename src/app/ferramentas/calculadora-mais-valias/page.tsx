import type { Metadata } from "next";
import { Check, ArrowRight, Coins, Wrench, TrendingUp, RefreshCcw, Euro, Home as HomeIcon, FileText, BarChart3, ShieldCheck, FileCheck2, Mail } from "lucide-react";

import { ClinicaHeader } from "@/components/clinica/clinica-header";
import { ClinicaFooter } from "@/components/clinica/clinica-footer";
import { ClinicaTrackView } from "@/components/clinica/clinica-track";
import { MvForm } from "@/components/clinica/mv-form";
import { MethodologyLink, ConditionsLink } from "@/components/clinica/mv-info-modals";
import { site, postalAddressJsonLd } from "@/lib/site";
import { FISCAL_YEAR } from "@/lib/tools/mais-valias-fiscal";

const canonical = "/ferramentas/calculadora-mais-valias";

export const metadata: Metadata = {
  title: "Calculadora de mais-valias imobiliárias | Clínica de Finanças HousePro",
  description:
    "Simule a mais-valia da venda do seu imóvel e receba uma estimativa detalhada por e-mail. Simuladores e informação imobiliária — gratuito, confidencial e sem compromisso.",
  keywords: [
    "calculadora mais-valias", "mais-valias imobiliárias", "imposto mais-valias venda casa",
    "simulador mais-valias IRS", "reinvestimento habitação própria", "coeficiente desvalorização",
  ],
  alternates: { canonical },
  openGraph: {
    title: "Venda com as contas bem feitas — Calculadora de mais-valias HousePro",
    description: "Simule a mais-valia da venda do seu imóvel e receba a estimativa no seu e-mail.",
    type: "website", locale: "pt_PT",
  },
};

const FAQ = [
  { q: "O que são mais-valias imobiliárias?", a: "É o ganho obtido com a venda de um imóvel: a diferença entre o valor de venda e o valor de aquisição (corrigido pela desvalorização da moeda), deduzidas as despesas e encargos elegíveis." },
  { q: "Que despesas podem ser consideradas?", a: "Encargos com a aquisição e a venda (por exemplo IMT, Imposto do Selo, escritura, registos, comissão de mediação e certificado energético) e obras de valorização no período legal, desde que documentadas. A elegibilidade depende do seu caso." },
  { q: "Como funciona o reinvestimento?", a: "Se o imóvel era a sua habitação própria e permanente e reinveste o valor de realização (líquido de empréstimo) noutra habitação própria e permanente, dentro dos prazos legais, a mais-valia pode ficar isenta, total ou parcialmente." },
  { q: "Como são tratadas as heranças?", a: "Em aquisições por herança (ou doação), o valor de aquisição corresponde ao valor considerado para efeitos de Imposto do Selo (VPT) à data. Introduza esse valor no simulador." },
  { q: "A simulação calcula o imposto final?", a: "Nem sempre. Para residentes, 50% da mais-valia é somada aos restantes rendimentos e tributada às taxas progressivas de IRS. Sem informação sobre o rendimento, apresentamos apenas a base sujeita a tributação." },
  { q: "Porque é que o resultado é enviado por e-mail?", a: "Para lhe entregar um relatório claro e organizado, com o resumo do cálculo, as notas e os próximos passos — e para um consultor poder ajudar a interpretá-lo, se assim o desejar." },
  { q: "A HousePro presta aconselhamento fiscal?", a: "Não. A Clínica de Finanças HousePro disponibiliza simuladores e informação imobiliária. Esta ferramenta é indicativa e não substitui aconselhamento fiscal, contabilístico ou jurídico." },
  { q: "Os meus dados ficam protegidos?", a: "Sim. Os dados são tratados apenas para enviar o relatório e responder ao pedido, nos termos da Política de Privacidade (RGPD). O consentimento de marketing é separado e opcional." },
];

export default function CalculadoraMaisValiasPage() {
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: "Calculadora de mais-valias imobiliárias — Clínica de Finanças HousePro", applicationCategory: "FinanceApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, url: `${site.url}${canonical}` },
    { "@context": "https://schema.org", "@type": "RealEstateAgent", name: site.brand, legalName: site.legalName, url: site.url, address: postalAddressJsonLd, email: site.email.general },
    { "@context": "https://schema.org", "@type": "LocalBusiness", name: `${site.brand} — ${site.legalName}`, address: postalAddressJsonLd, email: site.email.general },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: site.url },
      { "@type": "ListItem", position: 2, name: "Ferramentas", item: `${site.url}/ferramentas` },
      { "@type": "ListItem", position: 3, name: "Calculadora de mais-valias", item: `${site.url}${canonical}` },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="hp min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClinicaTrackView />
      <ClinicaHeader />

      <main>
        {/* HERO */}
        <section className="relative isolate overflow-hidden" style={{ background: "linear-gradient(105deg, #0B1F3A 0%, #174A7E 100%)" }}>
          {/* Grafismo analítico discreto */}
          <svg className="pointer-events-none absolute inset-0 -z-0 size-full opacity-[0.12]" aria-hidden><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#fff" strokeWidth="1" /></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
          <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
            <div className="max-w-xl text-white">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">Mais-valias imobiliárias</span>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">Venda com as contas bem feitas.</h1>
              <p className="mt-4 max-w-md text-base text-white/85 sm:text-lg">Simule a possível mais-valia da venda do seu imóvel e receba uma estimativa detalhada no seu e-mail.</p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {["Cálculo personalizado", "Metodologia transparente", "Gratuito e confidencial"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check className="size-4" style={{ color: "#7fb3d8" }} /> {t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a href="#simular" className="hp-btn-red inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg">Calcular agora <ArrowRight className="size-4" /></a>
                <a href="#como-funciona" className="text-sm font-semibold text-white underline-offset-4 hover:underline">Como funciona? ›</a>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-white/75"><Mail className="size-4" /> O resultado é enviado por e-mail.</p>
            </div>
          </div>
        </section>

        {/* CALCULADORA (#simular) */}
        <section id="simular" className="scroll-mt-16">
          <div className="mx-auto -mt-6 max-w-3xl px-4 sm:-mt-8 sm:px-6">
            <p className="mb-3 font-display text-xl text-foreground sm:hidden">Simulador de mais-valias</p>
            <MvForm />
          </div>
        </section>

        {/* O QUE VAMOS CONSIDERAR */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <h2 className="text-center font-display text-2xl sm:text-3xl">O que vamos considerar</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Coins, t: "Valor de aquisição", d: "O valor e a data em que adquiriu o imóvel." },
              { icon: Wrench, t: "Despesas e obras", d: "Encargos e obras que podem ser dedutíveis." },
              { icon: TrendingUp, t: "Coeficiente monetário", d: "Atualização do valor de aquisição ao longo do tempo." },
              { icon: RefreshCcw, t: "Reinvestimento", d: "Aplicação do valor da venda em nova habitação própria." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border bg-card p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}><c.icon className="size-5" /></span>
                <h3 className="mt-3 font-display text-base">{c.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* METODOLOGIA TRANSPARENTE */}
        <section id="como-funciona" className="scroll-mt-16 bg-[var(--card)]">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
            <p className="hp-eyebrow text-center">Metodologia transparente</p>
            <h2 className="mt-1 text-center font-display text-2xl sm:text-3xl">Perceba como chegamos à estimativa.</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-4">
              {[
                { n: 1, icon: Euro, t: "Venda", d: "Valor previsto de venda." },
                { n: 2, icon: HomeIcon, t: "Aquisição corrigida", d: "Valor de aquisição atualizado." },
                { n: 3, icon: FileText, t: "Despesas elegíveis", d: "Encargos e obras considerados." },
                { n: 4, icon: BarChart3, t: "Mais-valia estimada", d: "Diferença apurada (após ajustes)." },
              ].map((s) => (
                <li key={s.n} className="flex flex-col items-center gap-2 rounded-2xl border bg-background p-4 text-center shadow-sm" style={{ borderColor: "var(--border)" }}>
                  <span className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: "var(--hp-navy)" }}>{s.n}</span>
                  <s.icon className="size-6" style={{ color: "var(--hp-navy)" }} />
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 text-center" id="metodologia"><MethodologyLink /></div>
          </div>
        </section>

        {/* O QUE PODE INFLUENCIAR */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <h2 className="font-display text-2xl sm:text-3xl">O que pode influenciar o cálculo?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { t: "Obras e despesas documentadas", d: "Faturas e comprovativos podem aumentar o valor dedutível e reduzir a mais-valia." },
              { t: "Habitação própria e reinvestimento", d: "O destino do valor da venda pode ter impacto no cálculo." },
              { t: "Residência e situação fiscal", d: "O seu domicílio fiscal e outros fatores podem influenciar a estimativa." },
              { t: "Aquisição por herança ou doação", d: "O valor de aquisição corresponde ao VPT considerado para Imposto do Selo." },
              { t: "Percentagem de propriedade", d: "Se o imóvel é partilhado, o cálculo é proporcional à sua quota." },
              { t: "Importância dos comprovativos", d: "Sem documentos, algumas despesas podem não ser aceites." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-display text-base">{c.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* NO SEU E-MAIL */}
        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
          <div className="grid items-center gap-8 rounded-2xl border bg-[var(--card)] p-6 shadow-sm sm:p-8 lg:grid-cols-2" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="hp-eyebrow">No seu e-mail</p>
              <h2 className="mt-1 font-display text-2xl">Receba um relatório claro e organizado.</h2>
              {/* Pré-visualização SEM valores reais */}
              <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="flex items-center gap-2 text-sm font-medium"><Mail className="size-4" /> Relatório de Estimativa de Mais-valias</p>
                {["Resumo do cálculo", "Elementos considerados", "Notas importantes", "Próximos passos"].map((l) => (
                  <div key={l} className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{l}</span>
                    <span className="h-2 flex-1 rounded-full" style={{ background: "var(--secondary)" }} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <ul className="space-y-2 text-sm">
                {["Resumo do cálculo", "Elementos considerados", "Notas importantes", "Próximos passos"].map((l) => (
                  <li key={l} className="flex items-center gap-2"><ShieldCheck className="size-4" style={{ color: "var(--hp-navy)" }} /> {l}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">Depois do envio, um consultor poderá contactá-lo para ajudar a interpretar a simulação.</p>
              <a href="#simular" className="hp-btn-red mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">Começar simulação <ArrowRight className="size-4" /></a>
            </div>
          </div>
        </section>

        {/* NOTA IMPORTANTE */}
        <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
          <div className="flex flex-col gap-2 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
            <p className="flex items-start gap-2 text-muted-foreground">
              <FileCheck2 className="mt-0.5 size-5 shrink-0" style={{ color: "var(--hp-navy)" }} />
              <span><strong className="text-foreground">Nota importante.</strong> Esta ferramenta fornece uma estimativa meramente indicativa, baseada nos dados introduzidos e nas regras gerais aplicáveis. Não substitui aconselhamento fiscal, contabilístico ou jurídico, nem constitui uma liquidação oficial da Autoridade Tributária.</span>
            </p>
            <ConditionsLink className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-[var(--hp-navy)] hover:underline" />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 mx-auto max-w-3xl px-4 pb-12 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl">Mais-valias, sem complicações.</h2>
          <div className="mt-6 divide-y" style={{ borderColor: "var(--border)" }}>
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-display text-base marker:hidden sm:text-lg">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Estimativas referentes ao ano fiscal {FISCAL_YEAR}. Simuladores e informação imobiliária — sem aconselhamento fiscal regulado.</p>
        </section>

        {/* CTA FINAL */}
        <section style={{ background: "var(--hp-navy)" }}>
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center">
            <div className="text-white">
              <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">Vai vender? Comece por perceber os números.</h2>
              <p className="mt-2 text-sm text-white/75">Faça a simulação gratuitamente e receba a estimativa no seu e-mail.</p>
            </div>
            <div className="shrink-0">
              <a href="#simular" className="hp-btn-red inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg">Calcular mais-valias <ArrowRight className="size-4" /></a>
              <p className="mt-2 text-xs text-white/60">Sem compromisso · Dados protegidos</p>
            </div>
          </div>
        </section>
      </main>

      <ClinicaFooter />
    </div>
  );
}
