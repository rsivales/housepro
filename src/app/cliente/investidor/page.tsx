import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Calculator, Globe2, Mail } from "lucide-react";

import { ClientAreaShell } from "@/components/cliente/client-area-shell";
import { PortalNewsBanner } from "@/components/cliente/portal-news-banner";

export const metadata: Metadata = { title: "Investir com a HousePro", robots: { index: false, follow: false } };
export const revalidate = 300;

export default function InvestidorPortal() {
  return <ClientAreaShell active="investidor" eyebrow="Investimento imobiliário" title="Boas decisões começam com boa informação." description="Explore oportunidades, compare cenários e peça à equipa uma análise dos imóveis que fazem sentido para os seus objetivos." image="/signature/editorial-coast-hero.webp">
    <section className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-[1.5rem] border border-[#dce3ec] bg-white p-6 shadow-sm sm:p-8 dark:border-white/15 dark:bg-white/5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a31621]">Acompanhamento pessoal</p><h2 className="mt-2 font-display text-2xl font-semibold">Uma carteira com números verificados.</h2><p className="mt-3 max-w-xl text-sm leading-6 opacity-75">Ainda não existe uma carteira de investimento ligada a esta área. A equipa pode reunir os seus imóveis e preparar uma análise individual de rendas, custos, ocupação e rentabilidade.</p><a href={`mailto:geral@housepro.pt?subject=${encodeURIComponent("Análise da minha carteira imobiliária")}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a31621] px-5 py-3 text-sm font-semibold text-white hover:bg-[#bd2631]"><Mail className="size-4" /> Pedir análise da carteira</a></div>
      <div className="rounded-[1.5rem] bg-[#0b1f3a] p-6 text-white sm:p-8"><Building2 className="size-7 text-[#f5a7ad]" /><h2 className="mt-4 font-display text-xl">Encontre o próximo projeto</h2><p className="mt-2 text-sm leading-6 text-white/75">Veja imóveis, empreendimentos e oportunidades internacionais num só percurso.</p><Link href="/investir" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Explorar investimento <ArrowRight className="size-4" /></Link></div>
    </section>
    <section className="mt-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a31621]">Explore e compare</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Ferramentas para investir</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[{ icon: Building2, title: "Empreendimentos", text: "Compare projetos, tipologias e características.", href: "/empreendimentos" }, { icon: Calculator, title: "Custos de compra", text: "Estime IMT e Imposto do Selo.", href: "/ferramentas/imt" }, { icon: Globe2, title: "Internacional", text: "Conheça os projetos além de Portugal.", href: "/internacional" }].map(x => <Link key={x.href} href={x.href} className="group rounded-2xl border border-[#dce3ec] bg-white p-5 transition hover:border-[#a31621]/50 hover:shadow-md dark:border-white/15 dark:bg-white/5"><x.icon className="size-6 text-[#a31621]" /><h3 className="mt-4 font-semibold">{x.title}</h3><p className="mt-1 text-sm opacity-70">{x.text}</p><ArrowRight className="mt-4 size-4 transition group-hover:translate-x-1" /></Link>)}</div></section>
    <PortalNewsBanner />
  </ClientAreaShell>;
}
