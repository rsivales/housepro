import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck, ClipboardList, FileCheck2, House, Mail, TrendingUp, Users } from "lucide-react";

import { ClientAreaShell } from "@/components/cliente/client-area-shell";
import { PortalNewsBanner } from "@/components/cliente/portal-news-banner";
import { PortalWelcomeBanner } from "@/components/cliente/portal-welcome-banner";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOwnerPortalsByEmail } from "@/lib/db/owner-portal";
import { getClientPortalProfile } from "@/lib/db/client-portal";
import { ClientTaskList } from "@/components/cliente/client-task-list";

export const metadata: Metadata = { title: "Acompanhar a venda", robots: { index: false, follow: false } };

export default async function VendedorPortal() {
  if (!isSupabaseConfigured()) redirect("/cliente/entrar");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) redirect("/cliente/entrar");
  const profile = await getClientPortalProfile(user.id, user.email);
  if (!profile?.role) redirect("/cliente/escolher-perfil");
  if (profile.role !== "vendedor") redirect(`/cliente/${profile.role}`);
  const properties = await getOwnerPortalsByEmail(user.email);
  return <ClientAreaShell active="vendedor" eyebrow="Acompanhamento do proprietário" title="Vender com clareza, do início ao fim." description="Tenha os próximos passos à mão e acompanhe os dados concretos do seu imóvel através da ligação privada enviada pela equipa HousePro." image="/home/banner-familia.webp">
    {!profile.onboarded && <PortalWelcomeBanner
      title="Bem-vindo à sua área de venda, HousePro."
      tips={[
        "Veja aqui as visitas realizadas e os interessados no seu imóvel.",
        "Acompanhe as etapas da venda à medida que o processo avança.",
        "Documentos pedidos pela equipa aparecem aqui — carregue-os quando estiverem prontos; a validação é sempre feita pela HousePro.",
        "Precisa de ajuda? Peça acesso ou esclarecimentos por e-mail a qualquer momento.",
      ]}
    />}
    {properties.length > 0 && <section className="mt-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a31621]">Imóveis associados à sua conta</p><h2 className="mt-1 font-display text-2xl font-semibold">A sua venda, em números reais</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{properties.map(p => <article key={p.ref} className="rounded-[1.5rem] border border-[#dce3ec] bg-white p-5 shadow-sm dark:border-white/15 dark:bg-white/5"><p className="text-xs font-semibold text-[#a31621]">Ref. {p.ref} · {p.municipality}</p><h3 className="mt-1 font-display text-xl font-semibold">{p.title}</h3><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-[#f4f6f9] p-3 dark:bg-white/10"><CalendarCheck className="mb-2 size-4 text-[#a31621]" /><strong className="block text-lg">{p.visitsDone}</strong>visitas realizadas</p><p className="rounded-xl bg-[#f4f6f9] p-3 dark:bg-white/10"><Users className="mb-2 size-4 text-[#a31621]" /><strong className="block text-lg">{p.leadsCount}</strong>interessados</p></div><p className="mt-4 text-xs opacity-70">{p.dealStage ? `Processo em acompanhamento · ${p.milestones.find(m => !m.reached)?.label ?? "etapas registadas"}` : "Ainda sem negócio registado"}</p></article>)}</div></section>}
    {properties.some(p => p.tasks.length > 0) && <section className="mt-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a31621]">Documentos pedidos</p><h2 className="mt-1 font-display text-2xl font-semibold">Acompanhe e carregue o que falta</h2><p className="mt-1 text-sm opacity-70">A validação é sempre feita pela equipa HousePro.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{properties.filter(p => p.tasks.length > 0).map(p => <article key={p.ref} className="rounded-[1.5rem] border border-[#dce3ec] bg-white p-5 shadow-sm dark:border-white/15 dark:bg-white/5"><p className="text-xs font-semibold text-[#a31621]">Ref. {p.ref}</p><h3 className="mt-1 font-display text-lg font-semibold">{p.title}</h3><ClientTaskList tasks={p.tasks} /></article>)}</div></section>}
    <section className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-[1.5rem] border border-[#dce3ec] bg-white p-6 shadow-sm sm:p-8 dark:border-white/15 dark:bg-white/5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#a31621]">O seu imóvel</p><h2 className="mt-2 font-display text-2xl font-semibold">O acompanhamento é privado.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 opacity-75">{properties.length ? "O portal privado de cada imóvel reúne mais detalhes da atividade e do processo. Use a ligação enviada pelo seu consultor." : "Visitas, interessados e etapas da venda aparecem no portal privado do imóvel. Abra a ligação que o seu consultor lhe enviou. Se ainda não a recebeu, peça acesso à equipa."}</p>
        <a href={`mailto:geral@housepro.pt?subject=${encodeURIComponent("Acesso ao portal do proprietário")}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a31621] px-5 py-3 text-sm font-semibold text-white hover:bg-[#bd2631]"><Mail className="size-4" /> Pedir acesso ao meu imóvel</a>
      </div>
      <div className="rounded-[1.5rem] bg-[#0b1f3a] p-6 text-white sm:p-8"><FileCheck2 className="size-7 text-[#f5a7ad]" /><h2 className="mt-4 font-display text-xl">Prepare a venda sem surpresas</h2><p className="mt-2 text-sm leading-6 text-white/75">Documentação, valor de mercado e custos de venda merecem ser vistos antes de tomar decisões.</p><Link href="/ferramentas/calculadora-mais-valias" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white underline underline-offset-4">Calcular mais-valias <ArrowRight className="size-4" /></Link></div>
    </section>
    <section className="mt-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a31621]">No seu ritmo</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Recursos para cada decisão</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[{ icon: House, title: "Quanto vale a minha casa?", text: "Peça uma análise adaptada ao mercado local.", href: "/avaliacao-imovel" }, { icon: TrendingUp, title: "Mais-valias", text: "Faça uma simulação indicativa antes de vender.", href: "/ferramentas/calculadora-mais-valias" }, { icon: ClipboardList, title: "Preparar a venda", text: "Conheça o acompanhamento HousePro.", href: "/vender" }].map(x => <Link key={x.href} href={x.href} className="group rounded-2xl border border-[#dce3ec] bg-white p-5 transition hover:border-[#a31621]/50 hover:shadow-md dark:border-white/15 dark:bg-white/5"><x.icon className="size-6 text-[#a31621]" /><h3 className="mt-4 font-semibold">{x.title}</h3><p className="mt-1 text-sm opacity-70">{x.text}</p><ArrowRight className="mt-4 size-4 transition group-hover:translate-x-1" /></Link>)}</div></section>
    <PortalNewsBanner />
  </ClientAreaShell>;
}
