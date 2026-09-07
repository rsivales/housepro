import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Gem, MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { listProperties } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "HousePro Signature — Imóveis de assinatura em Portugal",
  description: "Uma seleção HousePro de imóveis portugueses com carácter, arquitetura e localização excecionais.",
};

export default async function SignaturePage() {
  const properties = await listProperties();
  const ranked = [...properties].sort((a, b) => b.price - a.price);
  // A curadoria começa no posicionamento premium; enquanto uma ficha não tiver
  // selo editorial próprio, mantemos uma seleção curta dos imóveis mais raros.
  const signature = ranked.filter((p) => p.price >= 1_000_000).slice(0, 9);
  const selection = signature.length ? signature : ranked.slice(0, 6);
  return <div className="min-h-dvh bg-[#f7f4ee] text-[#0a2342]"><SiteHeader /><main>
    <section className="relative isolate overflow-hidden bg-[#071c35] px-4 py-20 text-white sm:px-6 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_23%,rgba(191,151,79,.42),transparent_20%),radial-gradient(circle_at_18%_90%,rgba(13,59,102,.8),transparent_35%)]" />
      <div className="absolute -right-12 top-2 -z-10 font-serif text-[15rem] leading-none text-white/[.035] sm:text-[24rem]">S</div>
      <div className="mx-auto max-w-6xl"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#dec187]"><Crown className="size-4" /> HousePro Signature</p><h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[.98] sm:text-7xl">Casas que não se repetem.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/75">Uma curadoria nacional de imóveis singulares: arquitetura, vista, história, luz e uma sensação de lugar que não cabe numa pesquisa comum.</p><div className="mt-9 flex flex-wrap gap-3 text-sm"><span className="rounded-full border border-white/20 px-4 py-2">Portugal</span><span className="rounded-full border border-white/20 px-4 py-2">Seleção limitada</span><span className="rounded-full border border-white/20 px-4 py-2">Acompanhamento reservado</span></div></div>
    </section>
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><div className="grid gap-8 border-b border-[#0a2342]/15 pb-12 md:grid-cols-[1.1fr_.9fr]"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#a77b2b]">A nossa assinatura</p><h2 className="mt-3 max-w-xl font-serif text-4xl">Carácter antes de estatuto.</h2></div><p className="max-w-lg text-base leading-7 text-[#0a2342]/70">Não é uma montra internacional nem uma categoria automática por preço. É uma seleção exclusivamente portuguesa, construída imóvel a imóvel, para quem procura algo verdadeiramente distinto.</p></div>
      <div className="mt-12 flex items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#a77b2b]">Em destaque</p><h2 className="mt-2 font-serif text-3xl">A seleção atual</h2></div><span className="hidden items-center gap-1 text-sm text-[#0a2342]/60 sm:flex"><MapPin className="size-4" /> Portugal</span></div>
      {selection.length ? <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{selection.map((property) => <div key={property.id} className="group relative"><div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#071c35]/90 px-2.5 py-1 text-[11px] font-semibold text-[#f3d59a]"><Gem className="size-3"/> Signature</div><PropertyCard property={property}/></div>)}</div> : <div className="mt-7 rounded-3xl border border-[#0a2342]/15 bg-white p-10 text-center"><Sparkles className="mx-auto size-8 text-[#a77b2b]"/><h3 className="mt-3 font-serif text-2xl">A curadoria está a ser preparada.</h3><p className="mt-2 text-sm text-[#0a2342]/65">Partilhe connosco o que procura e apresentamos-lhe oportunidades reservadas.</p></div>}
      <div className="mt-16 grid gap-5 rounded-3xl bg-[#0a2342] p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-10"><div><p className="flex items-center gap-2 text-sm font-semibold text-[#dec187]"><ShieldCheck className="size-5"/> Serviço Signature</p><h2 className="mt-3 font-serif text-3xl">Procura uma casa que marque uma vida?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Diga-nos a localização, o estilo de vida e o que não abdica. A equipa HousePro prepara uma seleção feita para si.</p></div><Link href="/avaliacao-imovel" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c89a43] px-5 py-3 text-sm font-semibold text-[#071c35]">Falar com a equipa <ArrowRight className="size-4"/></Link></div>
    </section>
  </main><SiteFooter /></div>;
}
