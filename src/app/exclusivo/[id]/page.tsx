import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Sparkles, Phone } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { getPropertyById } from "@/lib/db/repo";
import { agentById } from "@/lib/data/mock";
import { exclusiveEligibility } from "@/lib/data/exclusive";
import { formatArea } from "@/lib/format";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyById(id);
  return { title: p ? `${p.title} — Exclusivo HousePro` : "Exclusivo" };
}

export default async function ExclusivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p || !p.exclusive || !exclusiveEligibility(p).eligible) notFound();

  const agent = agentById(p.agentId);
  const gallery = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(Boolean) as string[];

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      {/* Hero cinematográfico */}
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.title} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/60" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-between px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href={`/imovel/${p.id}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white">
              <ArrowLeft className="size-4" /> Ficha do imóvel
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur">
              <Sparkles className="size-3.5" /> COLEÇÃO EXCLUSIVA
            </span>
          </div>

          <div className="max-w-3xl pb-6">
            <p className="flex items-center gap-1.5 text-sm text-neutral-300">
              <MapPin className="size-4" /> {p.parish}, {p.municipality}
            </p>
            {p.exclusiveTagline && (
              <p className="mt-3 font-display text-xl text-amber-200/90 sm:text-2xl">{p.exclusiveTagline}</p>
            )}
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">{p.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-neutral-200">
              <span className="font-display text-2xl">{eur.format(p.price)}</span>
              <span className="flex items-center gap-1.5"><BedDouble className="size-4" /> {p.beds}</span>
              <span className="flex items-center gap-1.5"><Bath className="size-4" /> {p.baths}</span>
              <span className="flex items-center gap-1.5"><Maximize2 className="size-4" /> {formatArea(p.area)}</span>
              {p.typology && <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-sm">{p.typology}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Narrativa */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        {p.exclusiveStory && (
          <p className="font-display text-2xl leading-relaxed text-neutral-200 sm:text-3xl">{p.exclusiveStory}</p>
        )}
        {p.singularityNote && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-200/90">
              <Sparkles className="size-4" /> O que a torna única
            </p>
            <p className="mt-2 text-neutral-300">{p.singularityNote}</p>
          </div>
        )}
        {p.description && (
          <p className="mt-8 leading-relaxed text-neutral-400">{p.description}</p>
        )}
      </section>

      {/* Galeria */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {gallery.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className={`w-full rounded-2xl object-cover ${i === 0 ? "sm:col-span-2 aspect-[21/9]" : "aspect-[4/3]"}`} />
            ))}
          </div>
        </section>
      )}

      {/* Visita privada */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <AgentAvatar agent={agent} className="size-14 ring-2 ring-white/20" />
            <div>
              <p className="text-sm text-neutral-400">O seu consultor exclusivo</p>
              <p className="font-display text-xl">{agent.name}</p>
              <p className="text-sm text-neutral-400">{agent.agency}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {agent.whatsapp && (
              <a
                href={`https://wa.me/${agent.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
              >
                <Phone className="size-4" /> Agendar visita privada
              </a>
            )}
            <Link
              href={`/imovel/${p.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/10"
            >
              Ver ficha completa
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-background text-foreground">
        <SiteFooter />
      </div>
    </div>
  );
}
