import type { Metadata } from "next";
import type { ElementType } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, Bath, Maximize2, MapPin, Zap } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { propertyById, agentById } from "@/lib/data/mock";
import { formatArea, formatPrice, whatsappLink } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = propertyById(id);
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
  const property = propertyById(id);
  if (!property) notFound();

  const listingAgent = agentById(property.agentId);
  // Attribution: the referring consultant (who brought the client) owns the
  // contact — not the listing agent (angariador).
  const referrer =
    ref && ref !== property.agentId ? agentById(ref) : undefined;
  const contact = referrer ?? listingAgent;
  const gallery = property.gallery ?? [property.image];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/imoveis" className="hover:text-foreground">
            Imóveis
          </Link>{" "}
          / {property.municipality}
        </p>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-2xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gallery[0]}
                alt={property.title}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {gallery.slice(1, 5).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="aspect-square w-full rounded-lg border object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info + contact */}
          <div className="space-y-6">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatPrice(property)}
              </p>
              <h1 className="mt-2 font-display text-2xl leading-snug">
                {property.title}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {property.parish}, {property.municipality}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-4">
              <Spec label="Tipologia" value={property.typology ?? "—"} />
              <Spec icon={BedDouble} label="Quartos" value={String(property.beds)} />
              <Spec icon={Bath} label="WC" value={String(property.baths)} />
              <Spec icon={Maximize2} label="Área" value={formatArea(property.area)} />
              <Spec icon={Zap} label="Energia" value={property.energy} />
              <Spec label="Tipo" value={property.type} />
              <Spec label="Referência" value={property.reference} />
            </div>

            {/* Contact card */}
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
              <a
                href={whatsappLink(contact.whatsapp, property)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                <WhatsappIcon className="size-4" /> Falar por WhatsApp
              </a>
              <p className="mt-2 text-center">
                <PhoneNote />
              </p>
            </div>
          </div>
        </div>

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-xl">Descrição</h2>
          <p className="mt-3 text-muted-foreground">
            {property.type} {property.typology ?? ""} em {property.parish},{" "}
            {property.municipality}, com {property.area} m² e certificado
            energético {property.energy}. Excelente oportunidade acompanhada de
            perto por um consultor HousePro, do primeiro contacto à escritura.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon?: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
