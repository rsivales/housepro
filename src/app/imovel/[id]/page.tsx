import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
  ChevronUp,
  MapPin,
  Maximize2,
  Phone,
  Ruler,
  Trees,
  Zap,
  Sparkles,
  Pencil,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { PropertyActions } from "@/components/property/property-actions";
import { FavoriteButton } from "@/components/property/favorite-button";
import { AgentContactBar } from "@/components/property/agent-contact-bar";
import { ContactLink } from "@/components/property/contact-link";
import { ContactDialog } from "@/components/property/contact-dialog";
import { CostWizard } from "@/components/property/cost-wizard";
import { CreditSimulator } from "@/components/property/credit-simulator";
import { LocationMap } from "@/components/property/location-map";
import { PropertyCard } from "@/components/property/property-card";
import {
  PropertyGallery,
  type GalleryStat,
} from "@/components/property/property-gallery";
import { agentById } from "@/lib/data/mock";
import { exclusiveEligibility } from "@/lib/data/exclusive";
import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { getPropertyById, listSimilarProperties } from "@/lib/db/repo";
import { formatArea, formatPhone, formatPrice, smsLink, telLink, whatsappLink } from "@/lib/format";
import type { ElementType } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyById(id);
  return { title: p ? `${p.title} · ${p.reference}` : "Imóvel" };
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

  // Edição: dono, co-angariador ou staff (coordenação/direção/admin/super admin).
  const session = await getSession();
  const canEdit = Boolean(
    session &&
      (property.agentId === session.agent.id ||
        (property.coAgentIds ?? []).includes(session.agent.id) ||
        isStaff(session.agent))
  );

  const listingAgent = property.agent ?? agentById(property.agentId);
  // Attribution: the referring consultant (who brought the client) owns the
  // contact — not the listing agent (angariador).
  const referrer = ref && ref !== property.agentId ? agentById(ref) : undefined;
  const contact = referrer ?? listingAgent;

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "www.housepro.pt";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const propertyUrl = `${proto}://${host}/imovel/${property.id}${ref ? `?ref=${ref}` : ""}`;
  const gallery = property.gallery && property.gallery.length
    ? property.gallery
    : property.image
      ? [property.image]
      : [];
  const similares = await listSimilarProperties(property, 3);

  const description =
    property.description ??
    `${property.type} ${property.typology ?? ""} em ${property.parish}, ${property.municipality}, com ${property.area} m² e certificado energético ${property.energy}. Excelente oportunidade acompanhada de perto por um consultor HousePro, do primeiro contacto à escritura.`;

  // Ícones embutidos na foto
  const galleryStats: GalleryStat[] = [
    { key: "beds", label: "Quartos", value: `${property.beds} quartos` },
    {
      key: "areaUtil",
      label: "Área útil",
      value: `${property.areaUtil ?? property.area} m²${property.areaUtil ? " úteis" : ""}`,
    },
    ...(property.areaDependente
      ? [{ key: "areaDependente" as const, label: "Área dependente", value: `${property.areaDependente} m² dep.` }]
      : []),
    ...(property.landArea
      ? [{ key: "land" as const, label: "Terreno", value: `Lote ${property.landArea} m²` }]
      : []),
    ...(property.garage ? [{ key: "garage" as const, label: "Garagem", value: "Garagem" }] : []),
    ...(property.elevator ? [{ key: "elevator" as const, label: "Elevador", value: "Elevador" }] : []),
    ...(property.constructionYear
      ? [{ key: "year" as const, label: "Ano", value: `${property.constructionYear}` }]
      : []),
    { key: "location", label: "Localização", value: property.parish },
  ];

  // Características detalhadas
  const specs: { icon?: ElementType; label: string; value: string }[] = [
    { icon: Building2, label: "Tipo", value: property.type },
    { label: "Tipologia", value: property.typology ?? "—" },
    { icon: BedDouble, label: "Quartos", value: String(property.beds) },
    { icon: Bath, label: "Casas de banho", value: String(property.baths) },
    { icon: Maximize2, label: "Área bruta", value: formatArea(property.area) },
    ...(property.areaUtil ? [{ icon: Maximize2, label: "Área útil", value: formatArea(property.areaUtil) }] : []),
    ...(property.areaDependente ? [{ icon: Ruler, label: "Área dependente", value: formatArea(property.areaDependente) }] : []),
    ...(property.landArea ? [{ icon: Trees, label: "Terreno / lote", value: formatArea(property.landArea) }] : []),
    { icon: Car, label: "Estacionamento", value: property.garage ? "Sim" : "—" },
    { icon: ChevronUp, label: "Elevador", value: property.elevator ? "Sim" : "—" },
    ...(property.constructionYear ? [{ icon: CalendarDays, label: "Ano de construção", value: String(property.constructionYear) }] : []),
    { icon: Zap, label: "Certificado energético", value: property.energy },
    { label: "Referência", value: property.reference },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:pb-8">
        {/* Breadcrumbs — links de origem */}
        <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Início</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/imoveis" className="hover:text-foreground">Imóveis</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/imoveis" className="hover:text-foreground">{property.municipality}</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{property.reference}</span>
        </nav>

        {/* Cabeçalho (mobile-first: título e preço primeiro) */}
        <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">
              {property.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0 text-primary" />
              {property.parish}, {property.municipality}
            </p>
          </div>
          <p className="shrink-0 text-3xl font-semibold tracking-tight">
            {formatPrice(property)}
          </p>
        </header>

        {canEdit && (
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/app/imovel/${property.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary"
            >
              <Pencil className="size-4 text-primary" /> Editar imóvel
            </Link>
            <span className="text-xs text-muted-foreground">com histórico de alterações</span>
          </div>
        )}

        {property.exclusive && exclusiveEligibility(property).eligible && (
          <Link
            href={`/exclusivo/${property.id}`}
            className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4 transition-colors hover:from-amber-500/15"
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="size-5 text-amber-500" />
              <span>
                <span className="block text-sm font-medium">Imóvel da Coleção Exclusiva</span>
                <span className="block text-xs text-muted-foreground">Ver a página dedicada, com apresentação premium</span>
              </span>
            </span>
            <span className="text-sm font-medium text-primary">Abrir →</span>
          </Link>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-8">
            <PropertyGallery
              images={gallery}
              title={property.title}
              status={property.status}
              operation={property.operation}
              stats={galleryStats}
              videoUrl={property.videoUrl}
              tourUrl={property.tourUrl}
              beforeAfter={property.beforeAfter}
            />

            {/* Descrição curta em destaque */}
            {property.shortDescription && (
              <p className="text-lg leading-relaxed text-foreground/90">
                {property.shortDescription}
              </p>
            )}

            {/* Características */}
            <section>
              <h2 className="font-display text-xl">Características</h2>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border bg-card p-5 sm:grid-cols-3">
                {specs.map((s) => (
                  <div key={s.label}>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {s.icon && <s.icon className="size-3.5" />} {s.label}
                    </p>
                    <p className="mt-0.5 font-medium">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Descrição completa */}
            <section>
              <h2 className="font-display text-xl">Descrição</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                {description}
              </p>
            </section>

            {/* Localização */}
            <section>
              <h2 className="font-display text-xl">Localização</h2>
              <div className="mt-3">
                <LocationMap
                  parish={property.parish}
                  municipality={property.municipality}
                  lat={property.lat}
                  lng={property.lng}
                />
              </div>
            </section>

            {/* Financiamento */}
            <section>
              <h2 className="font-display text-xl">Financiamento</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Simule a prestação ou peça ao consultor o valor total com as
                despesas de compra incluídas.
              </p>
              <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
                <CreditSimulator initialPrice={property.price} />
                <div className="mt-6 border-t pt-5">
                  <CostWizard
                    propertyId={property.id}
                    reference={property.reference}
                    price={property.price}
                    referrerId={ref}
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Valores indicativos e estimados. Não dispensam simulação
                    bancária nem a validação do consultor.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Coluna de contacto (sticky) */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              {referrer && (
                <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  Apresentado por{" "}
                  <span className="font-medium text-foreground">{referrer.name}</span>{" "}
                  — o seu consultor dedicado.
                </p>
              )}
              <div className="flex items-center gap-3">
                <AgentAvatar agent={contact} className="size-12" />
                <div className="min-w-0">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.role} · {contact.agency}
                  </p>
                </div>
              </div>
              <ContactLink
                href={whatsappLink(contact.whatsapp, property, propertyUrl)}
                channel="WhatsApp"
                propertyId={property.id}
                refId={ref}
                external
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                <WhatsappIcon className="size-4" /> Falar por WhatsApp
              </ContactLink>
              <ContactLink
                href={telLink(contact.whatsapp)}
                channel="Chamada"
                propertyId={property.id}
                refId={ref}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Phone className="size-4" /> {formatPhone(contact.whatsapp)}
              </ContactLink>
              <p className="mt-1.5 text-center">
                <PhoneNote />
              </p>
              <div className="mt-4 border-t pt-4">
                <ContactDialog
                  propertyId={property.id}
                  referrerId={ref}
                  reference={property.reference}
                />
              </div>

              <div className="mt-3">
                <FavoriteButton propertyId={property.id} variant="labeled" />
              </div>
            </div>

            <PropertyActions
              info={{
                title: property.title,
                price: formatPrice(property),
                reference: property.reference,
                location: `${property.parish}, ${property.municipality}`,
                image: gallery[0],
                description,
                specs: specs.map((s) => ({ label: s.label, value: s.value })),
                contactName: contact.name,
                contactRole: `${contact.role} · ${contact.agency}`,
                contactPhoneNote: "Chamada para rede móvel nacional",
              }}
            />
          </aside>
        </div>

        {/* Imóveis semelhantes */}
        {similares.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl">Imóveis semelhantes</h2>
              <Link href="/imoveis" className="text-sm font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similares.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  referrer={referrer}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <AgentContactBar
        agent={contact}
        whatsappHref={whatsappLink(contact.whatsapp, property, propertyUrl)}
        telHref={telLink(contact.whatsapp)}
        smsHref={smsLink(contact.whatsapp, property, propertyUrl)}
        phone={formatPhone(contact.whatsapp)}
        propertyId={property.id}
        refId={ref}
      />
      <SiteFooter />
    </div>
  );
}
