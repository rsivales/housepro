import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handshake, MapPin, ChartNoAxesColumnIncreasing, Phone, Mail, ArrowRight, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import styles from "./profile.module.css";
import type { Property } from "@/lib/data/types";
import { STATUS_LABEL } from "@/lib/data/status";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { publicRoleLabel } from "@/lib/data/roles";
import { formatPrice, initials } from "@/lib/format";
import { getAgencyById, getAgentPublicById, listProperties } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
const getAgent = cache(getAgentPublicById);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: agent ? `${agent.name} · ${publicRoleLabel(agent)}` : "Consultor | HousePro", description: agent ? `Comprar ou vender casa com ${agent.name}. Conheça os imóveis publicados e entre em contacto com o seu consultor HousePro.` : undefined };
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
  const originalPortrait = agent.photo?.endsWith("/housepro-animacao-final-1790958471857-26yhr.webp");
  const banner = agent.banner || "/consultor/coastal-evening.webp";
  const contactProps = { href: primaryContact || "#contacto", target: whatsapp ? "_blank" : undefined, rel: whatsapp ? "noopener noreferrer" : undefined };
  function propertyStrip(p: Property) {
    return <Link key={p.id} href={`/imovel/${p.id}?ref=${agent!.id}`} className={styles.property} aria-label={`Conhecer imóvel: ${p.title}`}>
      <Image src={p.image} alt={p.title} fill unoptimized sizes="(min-width: 1200px) 1120px, 100vw" className={styles.propertyImage} />
      <div className={styles.propertyShade} />
      <div className={styles.propertyInfo}>
        <p className={styles.propertyMeta}>{p.status ? `${STATUS_LABEL[p.status]} · ` : ""}Ref. {p.reference}</p>
        <h3>{p.type}{p.typology ? ` ${p.typology}` : ""} · {p.municipality}</h3>
        <p className={styles.propertyTitle}>{p.title}</p>
        {p.priceVisible !== false && <p className={styles.propertyPrice}>{formatPrice(p)}</p>}
      </div>
      <span className={styles.propertyButton}>Conhecer imóvel <ChevronRight size={18} /></span>
    </Link>;
  }
  return <div className={styles.page}>
    <SiteHeader />
    <main>
      <section className={styles.hero} aria-label={`Apresentação de ${agent.name}`}>
        <Image src={banner} alt="" fill priority unoptimized sizes="100vw" className={styles.backdrop} />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <Link href={agency?.slug ? `/agencia/${agency.slug}` : "/"} className={styles.eyebrow}>{agencyName}</Link>
            <div className={styles.accent} />
            <h1>{agent.name}</h1>
            <p className={styles.role}>{publicRoleLabel(agent)}{agency?.region ? ` · ${agency.region}` : ""}</p>
            <div className={styles.pitch}>
              <h2>O seu próximo passo começa com confiança.</h2>
              <p>Comprar ou vender casa, com acompanhamento próximo em cada etapa.</p>
              {primaryContact && <a {...contactProps} className={styles.primaryButton}>{whatsapp ? <WhatsappIcon /> : <Mail />}<span>Falar com {firstName}</span><ChevronRight /></a>}
              <a href="#imoveis" className={styles.viewProperties}>Ver imóveis <ArrowRight size={22} /></a>
            </div>
          </div>
          {agent.photo ? <Image src={agent.photo} alt={agent.name} width={1080} height={1080} priority unoptimized sizes="(min-width: 1200px) 650px, 65vw" className={`${styles.portrait} ${originalPortrait ? styles.originalPortrait : styles.newPortrait}`} /> : <div className={styles.initials}>{initials(agent.name)}</div>}
        </div>
      </section>
      <div className={styles.affiliation}><div className={styles.container}><span>{agencyName}</span>{agency?.amiLicense && <span>AMI {agency.amiLicense}</span>}</div></div>
      <section className={`${styles.container} ${styles.intro}`}>
        <h2>Uma decisão importante.<br />Um acompanhamento pessoal.</h2>
        <p className={styles.introText}>Do primeiro contacto à escritura, conte com um acompanhamento atento e uma estratégia ajustada ao seu imóvel.</p>
        <div className={styles.services}>
          {[{icon:MapPin,title:"Conhecimento local",text:"O contexto do mercado para tomar decisões informadas."},{icon:ChartNoAxesColumnIncreasing,title:"Estratégia de divulgação",text:"O seu imóvel nos canais certos, com uma apresentação cuidada."},{icon:Handshake,title:"Acompanhamento até à escritura",text:"Ao seu lado em todas as etapas, com proximidade e transparência."}].map(({icon:Icon,title,text}) => <div key={title}><Icon /><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>
      <section id="imoveis" className={`${styles.container} ${styles.listings}`}>
        <h2>Imóveis com {firstName}</h2><div className={styles.accent} />
        {mine.length ? <div className={styles.propertyList}>{mine.map(propertyStrip)}</div> : <p className={styles.empty}>Neste momento não tenho imóveis publicados nesta seleção.{primaryContact && <a {...contactProps}> Fale comigo sobre o que procura.</a>}</p>}
      </section>
      {others.length > 0 && <section className={`${styles.container} ${styles.listings}`}><h2>Mais oportunidades HousePro</h2><p className={styles.introText}>Outros imóveis da rede que posso apresentar-lhe.</p><div className={styles.propertyList}>{others.map(propertyStrip)}</div></section>}
      <section id="contacto" className={styles.contact}>
        <Image src={banner} alt="" fill unoptimized sizes="100vw" className={styles.backdrop} /><div className={styles.contactShade} />
        <div className={styles.container}><div><h2>Vamos falar sobre o seu imóvel?</h2><p>Estou disponível para ajudar a encontrar a melhor solução.</p></div>{primaryContact && <a {...contactProps} className={styles.contactButton}>Entrar em contacto <ChevronRight size={20} /></a>}</div>
      </section>
      {phone && <div className={`${styles.container} ${styles.phoneNote}`}><PhoneNote /></div>}
    </main>
    <SiteFooter />
    {(phone || email) && <div className={styles.mobileContact}>{primaryContact && <a {...contactProps} className={styles.whatsappButton}>{whatsapp ? <WhatsappIcon /> : <Mail />}{whatsapp ? "WhatsApp" : "E-mail"}</a>}{phone && <a href={`tel:+${phone}`} className={styles.callButton}><Phone />Ligar</a>}</div>}
  </div>;
}
