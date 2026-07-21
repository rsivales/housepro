import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { ShareProperty } from "@/components/property/share-property";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { Button } from "@/components/ui/button";
import {
  agents,
  agentById,
  availableProperties,
  propertiesByAgent,
} from "@/lib/data/mock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = agents.find((x) => x.id === id);
  return { title: a ? `${a.name} · Consultor` : "Consultor" };
}

export default async function ConsultorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = agents.find((x) => x.id === id);
  if (!agent) notFound();

  const mine = propertiesByAgent(agent.id);
  const others = availableProperties
    .filter((p) => p.agentId !== agent.id)
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        {/* Profile */}
        <section className="border-b bg-secondary/40">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
            <AgentAvatar agent={agent} className="size-20" />
            <div className="flex-1">
              <h1 className="font-display text-3xl sm:text-4xl">{agent.name}</h1>
              <p className="mt-1 text-muted-foreground">
                {agent.role} ·{" "}
                <Link
                  href={`/agencia/${agentById(agent.id).agencyId}`}
                  className="hover:text-foreground"
                >
                  {agent.agency}
                </Link>
              </p>
            </div>
            <div className="text-right">
              <a
                href={`https://wa.me/${agent.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105"
              >
                <WhatsappIcon className="size-4" /> WhatsApp
              </a>
              <p className="mt-1.5">
                <PhoneNote />
              </p>
            </div>
          </div>
        </section>

        {/* Meus imóveis */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl">Os imóveis de {agent.name.split(" ")[0]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Partilhe qualquer imóvel com um cliente — o contacto fica atribuído a
            si automaticamente.
          </p>

          {mine.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((p) => (
                <div key={p.id} className="space-y-3">
                  <PropertyCard property={p} referrer={agent} />
                  <ShareProperty
                    propertyId={p.id}
                    reference={p.reference}
                    consultantId={agent.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-muted-foreground">
              Ainda sem imóveis publicados.
            </p>
          )}
        </section>

        {/* Outros imóveis (atribuídos ao consultor via a sua página) */}
        {others.length > 0 && (
          <section className="border-t bg-secondary/40 py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl">
                    Também lhe podem interessar
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    Imóveis de colegas que {agent.name.split(" ")[0]} pode
                    apresentar-lhe — o acompanhamento continua a ser dele.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/imoveis">
                    Mais imóveis <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((p) => (
                  <div key={p.id} className="space-y-3">
                    <PropertyCard property={p} referrer={agent} />
                    <ShareProperty
                      propertyId={p.id}
                      reference={p.reference}
                      consultantId={agent.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
