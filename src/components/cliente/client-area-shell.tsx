import Link from "next/link";
import { ArrowUpRight, Building2, Home, Newspaper, Store } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const tabs = [
  { href: "/cliente/comprador", label: "Comprar", icon: Home },
  { href: "/cliente/vendedor", label: "Vender", icon: Store },
  { href: "/cliente/investidor", label: "Investir", icon: Building2 },
];

export function ClientAreaShell({
  active, eyebrow, title, description, image, hideHero = false, children,
}: {
  active: "comprador" | "vendedor" | "investidor";
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  hideHero?: boolean;
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-[#f5f6f8] text-[#0b1f3a] dark:bg-[#0b1528] dark:text-white">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <nav aria-label="Áreas do cliente" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => <Link key={tab.href} href={tab.href} aria-current={active === tab.href.split("/").pop() ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active === tab.href.split("/").pop() ? "border-[#a31621] bg-[#a31621] text-white" : "border-[#d7dfe8] bg-white text-[#0b1f3a] hover:border-[#a31621] dark:border-white/20 dark:bg-white/10 dark:text-white"}`}><tab.icon className="size-4" />{tab.label}</Link>)}
      </nav>
      {!hideHero && <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#0b1f3a] text-white shadow-xl shadow-[#0b1f3a]/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071a32] via-[#071a32]/90 to-[#071a32]/25" />
        <div className="relative max-w-2xl px-6 py-10 sm:px-10 sm:py-14 lg:py-20">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#ffb8bd]"><span className="h-px w-7 bg-[#f0828a]" /> {eyebrow}</p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/85 sm:text-base">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/imoveis" className="inline-flex items-center gap-2 rounded-full bg-[#a31621] px-5 py-3 text-sm font-bold text-white hover:bg-[#bd2631]">Explorar imóveis <ArrowUpRight className="size-4" /></Link>
            <Link href="/noticias" className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"><Newspaper className="size-4" /> Guia HousePro</Link>
          </div>
        </div>
      </section>}
      {children}
    </main>
    <SiteFooter />
  </div>;
}
