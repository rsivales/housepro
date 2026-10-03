import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handshake, MapPin, Megaphone, Phone, Mail, Building2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { publicRoleLabel } from "@/lib/data/roles";
import { initials } from "@/lib/format";
import { getAgencyById, getAgentPublicById, listProperties } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
const getAgent = cache(getAgentPublicById);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: agent ? `${agent.name} · ${publicRoleLabel(agent)} | HousePro` : "Consultor | HousePro", description: agent ? `Comprar ou vender casa com ${agent.name}. Conheça os imóveis publicados e entre em contacto com o seu consultor HousePro.` : undefined };
}

export default async function ConsultorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();
  // Use the public catalogue even for signed-in staff: private/draft/off-market
  // listings must never leak through the consultant's public profile.
  const [catalogue, agency] = await Promise.all([listProperties(), getAgencyById(agent.agencyId)]);
  const mine = catalogue.filter((p) => p.agentId === agent.id);
  const others = catalogue.filter((p) => p.agentId !== agent.id).slice(0, 3);
  const agencyName = agency?.name || agent.agency || "HousePro";
  const phone = agent.whatsapp.replace(/\D/g, "");
  const whatsapp = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${agent.name.split(" ")[0]}, gostaria de falar sobre comprar ou vender um imóvel.`)}` : undefined;
  const email = agent.email ? `mailto:${agent.email}` : undefined;
  const primaryContact = whatsapp || email;
  const firstName = agent.name.split(" ")[0];
  const contactClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4";

  return <div className="min-h-dvh bg-background pb-24 text-foreground sm:pb-0">
    <SiteHeader />
    <main>
      <section className="relative isolate overflow-hidden bg-[#0D3B66] text-white">
        {agent.banner && <Image src={agent.banner} alt="" fill unoptimized priority sizes="100vw" className="-z-20 object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08263f]/95 via-[#0D3B66]/90 to-[#0D3B66]/60" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-16">
          <div className="min-w-0">
            <Link href={agency?.slug ? `/agencia/${agency.slug}` : "/"} className="text-sm font-semibold tracking-[0.18em] uppercase text-white/85 hover:text-white">{agencyName}</Link>
            <div className="mt-4 h-1 w-12 bg-[#c82333]" />
            <h1 className="mt-5 break-words font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.06] tracking-tight">{agent.name}</h1>
            <p className="mt-3 text-base text-white/85 sm:text-lg">{publicRoleLabel(agent)}{agency?.region ? ` · ${agency.region}` : ""}</p>
            <h2 className="mt-7 max-w-lg font-display text-2xl leading-tight sm:text-3xl">O seu próximo passo começa com confiança.</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">Comprar ou vender casa, com acompanhamento próximo em cada etapa.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryContact && <a href={primaryContact} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined} className={`${contactClass} bg-white text-[#0D3B66] hover:bg-white/90`}>{whatsapp ? <WhatsappIcon className="size-5" /> : <Mail className="size-5" />} Falar com {firstName}</a>}
              <a href="#imoveis" className={`${contactClass} border border-white/40 text-white hover:bg-white/10`}>Ver imóveis</a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-t-[3rem] rounded-b-xl border border-white/20 bg-white/10 shadow-2xl lg:max-w-none">
            {agent.photo ? <Image src={agent.photo} alt={agent.name} width={600} height={650} priority unoptimized sizes="(min-width: 1024px) 420px, 90vw" className="aspect-[1/1] w-full object-contain lg:aspect-[4/5]" /> : <div className="flex aspect-[4/3] items-center justify-center font-display text-8xl text-white/80" aria-label={agent.name}>{initials(agent.name)}</div>}
            <div className="border-t border-white/15 bg-[#08263f]/80 px-5 py-4">
              <p className="text-sm font-semibold">{agent.name}</p><p className="mt-1 text-sm text-white/70">{agencyName}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="border-b bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm sm:px-6">
          <span className="inline-flex items-center gap-2"><Building2 className="size-4 text-[#A31621]" />{agencyName}</span>
          {agency?.amiLicense && <span className="text-muted-foreground">Licença AMI {agency.amiLicense}</span>}
          {agency?.region && <span className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" />{agency.region}</span>}
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
          <h2 className="max-w-lg font-display text-3xl leading-tight sm:text-4xl">Uma decisão importante.<br />Um acompanhamento pessoal.</h2>
          <p className="max-w-xl self-center text-base leading-relaxed text-muted-foreground sm:text-lg">Do primeiro contacto à escritura, conte com um acompanhamento atento e uma estratégia ajustada ao seu imóvel.</p>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-8">
          {[{icon:MapPin,title:"Conhecimento local",text:"O contexto do mercado para tomar decisões informadas."},{icon:Megaphone,title:"Estratégia de divulgação",text:"Uma apresentação cuidada e comunicação ajustada a cada imóvel."},{icon:Handshake,title:"Acompanhamento até à escritura",text:"Um contacto próximo ao longo de todo o processo."}].map(({icon:Icon,title,text}) => <div key={title} className="border-t border-border pt-5"><Icon className="size-7 text-[#A31621]" /><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-2 text-base leading-relaxed text-muted-foreground">{text}</p></div>)}
        </div>
      </section>
      <section id="imoveis" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-14 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Imóveis com {firstName}</h2>
        <div className="mt-4 h-1 w-12 bg-[#A31621]" />
        <p className="mt-4 text-base text-muted-foreground">Conheça os imóveis publicados e fale comigo para saber mais.</p>
        {mine.length ? <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{mine.map(p => <PropertyCard key={p.id} property={p} referrer={agent} />)}</div> : <div className="mt-7 rounded-xl border p-6"><p className="text-base text-muted-foreground">Neste momento não tenho imóveis publicados nesta seleção.</p>{primaryContact && <a href={primaryContact} className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#A31621]">Fale comigo sobre o que procura</a>}</div>}
      </section>
      {others.length > 0 && <section className="border-y bg-secondary/25 py-12"><div className="mx-auto max-w-6xl px-5 sm:px-6"><h2 className="font-display text-3xl">Mais oportunidades HousePro</h2><p className="mt-3 text-base text-muted-foreground">Outros imóveis da rede que posso apresentar-lhe, com o meu acompanhamento.</p><div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{others.map(p => <PropertyCard key={p.id} property={p} referrer={agent} />)}</div></div></section>}
      <section id="contacto" className="bg-[#0D3B66] text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-7 px-5 py-12 sm:px-6"><div><h2 className="font-display text-3xl">Vamos falar sobre o seu imóvel?</h2><p className="mt-3 text-base text-white/80">Conte-me o que procura ou o que pretende vender.</p></div><div className="flex flex-wrap gap-3">{primaryContact && <a href={primaryContact} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined} className={`${contactClass} bg-white text-[#0D3B66] hover:bg-white/90`}>Entrar em contacto</a>}{phone && <a href={`tel:+${phone}`} className={`${contactClass} border border-white/40 hover:bg-white/10`}><Phone className="size-5" />Ligar</a>}</div>{phone && <div className="w-full text-white/70"><PhoneNote /></div>}</div></section>
    </main>
    <SiteFooter />
    {(phone || email) && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur sm:hidden"><div className="mx-auto flex max-w-lg gap-3">{primaryContact && <a href={primaryContact} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined} className={`${contactClass} flex-1 bg-[#A31621] text-white`}>{whatsapp ? <WhatsappIcon className="size-5" /> : <Mail className="size-5" />}{whatsapp ? "WhatsApp" : "E-mail"}</a>}{phone && <a href={`tel:+${phone}`} className={`${contactClass} flex-1 border`}><Phone className="size-5" />Ligar</a>}</div></div>}
  </div>;
}
