import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Check, FileText, Heart, Home, Mail, Search, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureBuyerContact } from "@/lib/db/repo";
import { getBuyerPortalDataByContactId } from "@/lib/db/buyer-portal";
import { ClientAreaShell } from "@/components/cliente/client-area-shell";
import { ClientNameEditor } from "@/components/cliente/client-name-editor";
import { PortalNewsBanner } from "@/components/cliente/portal-news-banner";
import { FavoritesList } from "@/components/cliente/favorites-list";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "A minha área de compra", robots: { index: false, follow: false } };

export default async function CompradorPortal() {
  if (!isSupabaseConfigured()) redirect("/cliente/entrar");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) redirect("/cliente/entrar");
  const contact = await ensureBuyerContact(user.id, user.email);
  const deal = contact ? await getBuyerPortalDataByContactId(contact.id, contact.name) : null;
  const firstName = contact?.name?.split(" ")[0] || user.email.split("@")[0];
  const next = deal?.milestones.find(m => !m.reached);

  return <ClientAreaShell active="comprador" eyebrow={`A sua área pessoal · ${firstName}`} title="A sua próxima casa começa aqui." description="Acompanhe o seu processo, guarde imóveis, compare opções e encontre informação útil para decidir com confiança." image="/imt/hero-algarve.webp">
    <div className="mt-7 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
      <section className="rounded-[1.5rem] border border-[#dce3ec] bg-white p-5 shadow-sm sm:p-7 dark:border-white/15 dark:bg-white/5">
        <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#a31621]/10 text-[#a31621]"><Home className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a31621]">O seu percurso</p><h2 className="mt-1 font-display text-2xl font-semibold">{deal?.propertyRef ? "Compra em acompanhamento" : "Vamos encontrar a casa certa"}</h2></div></div>
        {deal?.propertyRef ? <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-[#f4f6f9] p-4 dark:bg-white/10">
          {deal.propertyImage ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={deal.propertyImage} alt="" className="size-20 rounded-xl object-cover" /> : <div className="grid size-20 place-items-center rounded-xl bg-white/80"><Home /></div>}
          <div className="min-w-0 flex-1"><p className="font-semibold">{deal.propertyTitle || "O seu imóvel"}</p><p className="mt-1 text-sm opacity-70">Ref. {deal.propertyRef}{deal.amount ? ` · ${formatEuro(deal.amount)}` : ""}</p><p className="mt-2 text-sm font-medium text-[#a31621]">{next ? `Próxima etapa: ${next.label}` : "Etapas acompanhadas pelo seu consultor"}</p></div>
        </div> : <><p className="mt-5 max-w-xl text-sm leading-6 opacity-75">Ainda não há uma compra ligada à sua conta. Quando o consultor associar um negócio ao seu contacto, o acompanhamento aparece aqui.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/imoveis?operacao=comprar" className="inline-flex items-center gap-2 rounded-full bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-[#0b1f3a]"><Search className="size-4" /> Encontrar imóveis</Link><a href={`mailto:geral@housepro.pt?subject=${encodeURIComponent("Apoio à compra de casa")}`} className="inline-flex items-center gap-2 rounded-full border border-[#cdd7e4] px-5 py-3 text-sm font-semibold hover:bg-[#f4f6f9] dark:border-white/20"><Mail className="size-4" /> Falar com a equipa</a></div></>}
      </section>
      <aside className="rounded-[1.5rem] bg-[#0b1f3a] p-6 text-white shadow-sm sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#f5a7ad]">A sua conta</p><h2 className="mt-2 font-display text-xl">Uma experiência à sua medida.</h2><p className="mt-2 text-sm leading-6 text-white/70">Escolha como prefere ser tratado. O email de entrada está associado a esta conta.</p><ClientNameEditor name={contact?.name ?? ""} email={user.email} /></aside>
    </div>
    <PortalNewsBanner />
    {deal?.propertyRef && <section className="mt-6 rounded-[1.5rem] border border-[#dce3ec] bg-white p-5 sm:p-7 dark:border-white/15 dark:bg-white/5"><div className="flex items-center gap-3"><CalendarDays className="size-5 text-[#a31621]" /><h2 className="font-display text-xl font-semibold">Etapas da compra</h2></div><ol className="mt-5 grid gap-3 sm:grid-cols-2">{deal.milestones.map(m => <li key={m.stage} className="flex items-center gap-3 rounded-xl border border-[#e3e8ef] px-4 py-3 text-sm dark:border-white/10"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${m.reached ? "bg-[#a31621] text-white" : "bg-[#f1f3f6] text-[#55657b] dark:bg-white/10 dark:text-white"}`}>{m.reached ? <Check className="size-4" /> : "·"}</span><span className="flex-1 font-medium">{m.label}</span>{m.at && <time className="text-xs opacity-60" dateTime={m.at}>{new Date(m.at).toLocaleDateString("pt-PT")}</time>}</li>)}</ol></section>}
    <section className="mt-10"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a31621]">Ferramentas úteis</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Planeie com números claros</h2></div><Link href="/ferramentas" className="inline-flex items-center gap-1 text-sm font-semibold text-[#a31621]">Todas as ferramentas <ArrowRight className="size-4" /></Link></div><div className="grid gap-3 sm:grid-cols-3">{[{ href: "/ferramentas/imt", title: "Calcular IMT e Selo", note: "Prepare os impostos da compra", icon: FileText }, { href: "/credito", title: "Simular prestação", note: "Estime o crédito mensal", icon: Wallet }, { href: "/imoveis?operacao=comprar", title: "Descobrir casas", note: "Explore e guarde favoritas", icon: Search }].map(a => <Link key={a.href} href={a.href} className="group flex items-center gap-4 rounded-2xl border border-[#dce3ec] bg-white p-4 transition hover:border-[#a31621]/50 hover:shadow-md dark:border-white/15 dark:bg-white/5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f7e9eb] text-[#a31621]"><a.icon className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{a.title}</strong><span className="text-xs opacity-65">{a.note}</span></span><ArrowRight className="size-4 opacity-50 transition group-hover:translate-x-1" /></Link>)}</div></section>
    <section id="favoritos" className="mt-12 scroll-mt-24"><div className="flex items-center gap-3"><Heart className="size-5 text-[#a31621]" /><h2 className="font-display text-2xl font-semibold sm:text-3xl">Os meus imóveis guardados</h2></div><p className="mt-1 text-sm opacity-70">Guarde os que lhe interessam e compare lado a lado.</p><FavoritesList /></section>
  </ClientAreaShell>;
}
