import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ChevronRight, Pencil, Sparkles, Zap } from "lucide-react";

import { PropertyHeader } from "@/components/property/property-header";
import { PropertyHero, type HeroStat } from "@/components/property/property-hero";
import { PropertyEditorialGallery } from "@/components/property/property-editorial-gallery";
import { PropertyDescription } from "@/components/property/property-description";
import { PropertyLocation } from "@/components/property/property-location";
import { FinancingPanel } from "@/components/property/financing-panel";
import { VisitRequest } from "@/components/property/visit-request";
import { SimilarCarousel } from "@/components/property/similar-carousel";
import { PropertyShareRow } from "@/components/property/property-share-row";
import { ConsultantPanel } from "@/components/property/consultant-panel";
import { AgentContactBar } from "@/components/property/agent-contact-bar";
import { PropertyFooter } from "@/components/property/property-footer";
import { PdpView } from "@/components/property/pdp-view";
import { agentById } from "@/lib/data/mock";
import { exclusiveEligibility } from "@/lib/data/exclusive";
import { getSession } from "@/lib/supabase/auth";
import { isStaff, roleLabel } from "@/lib/data/roles";
import { getPropertyById, listSimilarProperties } from "@/lib/db/repo";
import { formatArea, formatPhone, formatPrice, smsLink, telLink, whatsappLink } from "@/lib/format";
import { site, postalAddressJsonLd } from "@/lib/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) return { title: "Imóvel" };
  const canonical = `${SITE_URL}/imovel/${p.id}`;
  const description =
    p.shortDescription ??
    `${p.type}${p.typology ? " " + p.typology : ""} em ${p.parish}, ${p.municipality}. ${formatPrice(p)} · Ref. ${p.reference}. Acompanhamento HousePro do primeiro contacto à escritura.`;
  return {
    title: `${p.title} · ${p.reference}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${p.title} · HousePro`,
      description,
      url: canonical,
      type: "website",
      images: p.image ? [{ url: p.image.startsWith("http") ? p.image : `${SITE_URL}${p.image}` }] : undefined,
    },
  };
}

export default async function ImovelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const { ref } = await searchParams;
  const property = await getPropertyById(id);
  if (!property) notFound();

  // Edição: dono, co-angariador ou staff (validado no servidor — nunca só CSS).
  const session = await getSession();
  const canEdit = Boolean(
    session &&
      (property.agentId === session.agent.id ||
        (property.coAgentIds ?? []).includes(session.agent.id) ||
        isStaff(session.agent))
  );

  const listingAgent = property.agent ?? agentById(property.agentId);
  // Atribuição: o consultor que trouxe o cliente (?ref) fica com o contacto.
  const referrer = ref && ref !== property.agentId ? agentById(ref) : undefined;
  const contact = referrer ?? listingAgent;
  // Papel público (nunca expor "admin" ao público).
  const publicRole = contact.roleKey
    ? roleLabel(contact.roleKey)
    : /admin/i.test(contact.role)
      ? "Consultor HousePro"
      : contact.role;

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "www.housepro.pt";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const propertyUrl = `${proto}://${host}/imovel/${property.id}${ref ? `?ref=${ref}` : ""}`;

  const gallery = property.gallery && property.gallery.length
    ? property.gallery
    : property.image
      ? [property.image]
      : [];
  const similares = await listSimilarProperties(property, 4);

  const editorialTitle = property.editorialTitle ?? "Sobre este imóvel";
  const shortSummary =
    property.shortDescription ??
    `${property.type}${property.typology ? " " + property.typology : ""} em ${property.parish}, ${property.municipality}.`;
  const description =
    property.description ??
    `${property.type} ${property.typology ?? ""} em ${property.parish}, ${property.municipality}, com ${formatArea(property.area)} e certificado energético ${property.energy}. Acompanhado de perto por um consultor HousePro, do primeiro contacto à escritura.`;

  // Características na faixa do hero (só valores reais; sem repetir noutra grelha).
  const heroStats: HeroStat[] = [
    { key: "beds", label: "Quartos", value: `${property.beds} quartos` },
    { key: "baths", label: "Casas de banho", value: `${property.baths} WC` },
    {
      key: "areaUtil",
      label: "Área útil",
      value: `${property.areaUtil ?? property.area} m²${property.areaUtil ? " úteis" : ""}`,
    },
    ...(property.areaDependente
      ? [{ key: "areaDependente", label: "Área dependente", value: `${property.areaDependente} m² dep.` }]
      : []),
    ...(property.landArea ? [{ key: "land", label: "Terreno", value: `Lote ${property.landArea} m²` }] : []),
    ...(property.garage ? [{ key: "garage", label: "Garagem", value: "Garagem" }] : []),
    ...(property.elevator ? [{ key: "elevator", label: "Elevador", value: "Elevador" }] : []),
    ...(property.constructionYear ? [{ key: "year", label: "Ano", value: `${property.constructionYear}` }] : []),
  ];

  // Ficha técnica mínima (o que NÃO está na faixa do hero — sem duplicar).
  const printSpecs = [
    { label: "Tipo", value: property.type },
    { label: "Tipologia", value: property.typology ?? "—" },
    { label: "Quartos", value: String(property.beds) },
    { label: "Casas de banho", value: String(property.baths) },
    { label: "Área bruta", value: formatArea(property.area) },
    ...(property.areaUtil ? [{ label: "Área útil", value: formatArea(property.areaUtil) }] : []),
    { label: "Certificado energético", value: property.energy },
    { label: "Referência", value: property.reference },
  ];

  const priceLabel = formatPrice(property);
  const unavailable = property.status === "vendido" || property.status === "reservado";

  // Dados estruturados: BreadcrumbList + Residence/Offer + RealEstateAgent.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Imóveis", item: `${SITE_URL}/imoveis` },
          { "@type": "ListItem", position: 3, name: property.municipality, item: `${SITE_URL}/imoveis` },
          { "@type": "ListItem", position: 4, name: property.reference },
        ],
      },
      {
        "@type": "Residence",
        name: property.title,
        description,
        numberOfRoomsTotal: property.beds,
        numberOfBathroomsTotal: property.baths,
        floorSize: { "@type": "QuantitativeValue", value: property.area, unitCode: "MTK" },
        address: { "@type": "PostalAddress", addressLocality: property.municipality, addressRegion: property.district, addressCountry: "PT" },
        ...(property.image ? { image: property.image.startsWith("http") ? property.image : `${SITE_URL}${property.image}` } : {}),
        offers: {
          "@type": "Offer",
          price: property.price,
          priceCurrency: "EUR",
          availability: unavailable ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          url: `${SITE_URL}/imovel/${property.id}`,
        },
      },
      {
        "@type": "RealEstateAgent",
        name: site.brand,
        legalName: site.legalName,
        identifier: `AMI ${site.amiLicense}`,
        address: postalAddressJsonLd,
        email: site.email.general,
        url: SITE_URL,
      },
    ],
  };

  return (
    <div className="hp min-h-dvh bg-[var(--card)] text-[var(--hp-navy)]">
      <PdpView />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PropertyHeader />

      {/* Breadcrumbs — linha única com scroll horizontal no telemóvel */}
      <nav
        aria-label="Navegação"
        className="mx-auto max-w-6xl overflow-x-auto px-4 pt-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex w-max items-center gap-1 whitespace-nowrap text-sm text-[var(--hp-text-2)]">
          <li><Link href="/" className="hover:text-[var(--hp-navy)]">Início</Link></li>
          <ChevronRight className="size-3.5 shrink-0" />
          <li><Link href="/imoveis" className="hover:text-[var(--hp-navy)]">Imóveis</Link></li>
          <ChevronRight className="size-3.5 shrink-0" />
          <li><Link href="/imoveis" className="hover:text-[var(--hp-navy)]">{property.municipality}</Link></li>
          <ChevronRight className="size-3.5 shrink-0" />
          <li className="font-medium text-[var(--hp-navy)]">{property.reference}</li>
        </ol>
      </nav>

      <main className="pb-28 lg:pb-8">
        {/* Hero imersivo */}
        <div className="mx-auto max-w-6xl px-0 pt-3 sm:px-6">
          <PropertyHero
            images={gallery}
            title={property.title}
            parish={property.parish}
            municipality={property.municipality}
            price={priceLabel}
            status={property.status}
            operation={property.operation}
            stats={heroStats}
            propertyId={property.id}
            objectPosition={property.imageFocus}
          />
        </div>

        {canEdit && (
          <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
            <Link
              href={`/app/imovel/${property.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-black/[0.03]"
            >
              <Pencil className="size-4 text-[var(--hp-red)]" /> Editar imóvel
              <span className="text-xs text-[var(--hp-text-2)]">· com histórico</span>
            </Link>
          </div>
        )}

        <div className="mx-auto mt-8 grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_340px]">
          {/* Coluna editorial */}
          <div className="min-w-0 space-y-12">
            {/* Introdução editorial */}
            <section>
              <h2 className="font-display text-2xl text-[var(--hp-navy)]">{editorialTitle}</h2>
              <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--hp-navy)]/90">{shortSummary}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--hp-text-2)]">
                <span className="inline-flex items-center gap-1.5"><Zap className="size-4 text-[var(--hp-red)]" /> Certificado {property.energy}</span>
                <span aria-hidden>·</span>
                <span>Ref. {property.reference}</span>
              </p>
              <a href="#descricao" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hp-red)] hover:underline">
                Ler descrição completa <ChevronRight className="size-4" />
              </a>
            </section>

            {unavailable && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 text-sm text-amber-800">
                Este imóvel está {property.status === "vendido" ? "vendido" : "reservado"}. Fale com o consultor —
                encontramos alternativas semelhantes para si (veja em baixo).
              </div>
            )}

            {property.exclusive && exclusiveEligibility(property).eligible && (
              <Link
                href={`/exclusivo/${property.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4 transition-colors hover:from-amber-500/15"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="size-5 text-amber-500" />
                  <span>
                    <span className="block text-sm font-medium">Imóvel da Coleção Exclusiva</span>
                    <span className="block text-xs text-[var(--hp-text-2)]">Ver a apresentação premium dedicada</span>
                  </span>
                </span>
                <span className="text-sm font-medium text-[var(--hp-red)]">Abrir →</span>
              </Link>
            )}

            <PropertyEditorialGallery
              images={gallery}
              plans={property.plans}
              videoUrl={property.videoUrl}
              tourUrl={property.tourUrl}
              title={property.title}
            />

            <PropertyDescription text={description} />

            <PropertyLocation
              parish={property.parish}
              municipality={property.municipality}
              lat={property.lat}
              lng={property.lng}
              privacy={property.locationPrivacy}
            />

            <FinancingPanel
              price={property.price}
              propertyId={property.id}
              reference={property.reference}
              referrerId={ref}
            />

            <VisitRequest propertyId={property.id} reference={property.reference} referrerId={ref} />

            <PropertyShareRow
              propertyId={property.id}
              info={{
                title: property.title,
                price: priceLabel,
                reference: property.reference,
                location: `${property.parish}, ${property.municipality}`,
                image: gallery[0] ?? "",
                description,
                specs: printSpecs,
                contactName: contact.name,
                contactRole: `${publicRole} · ${contact.agency}`,
                contactPhoneNote: "Chamada para rede móvel nacional",
              }}
            />
          </div>

          {/* Painel do consultor (sticky, desktop) */}
          <ConsultantPanel
            agent={contact}
            role={`${publicRole} · ${contact.agency}`}
            whatsappHref={whatsappLink(contact.whatsapp, property, propertyUrl)}
            telHref={telLink(contact.whatsapp)}
            phone={formatPhone(contact.whatsapp)}
            propertyId={property.id}
            refId={ref}
            referrerName={referrer?.name}
          />
        </div>

        {/* Imóveis semelhantes */}
        {similares.length > 0 && (
          <div className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
            <SimilarCarousel properties={similares} referrer={referrer} />
          </div>
        )}
      </main>

      {/* Barra fixa do consultor (telemóvel) */}
      <AgentContactBar
        agent={contact}
        whatsappHref={whatsappLink(contact.whatsapp, property, propertyUrl)}
        telHref={telLink(contact.whatsapp)}
        smsHref={smsLink(contact.whatsapp, property, propertyUrl)}
        phone={formatPhone(contact.whatsapp)}
        propertyId={property.id}
        refId={ref}
      />

      <PropertyFooter />
    </div>
  );
}
