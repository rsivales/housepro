import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Check, Globe2, Handshake, Info, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { internationalById, internationalProjects } from "@/lib/data/international";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function generateStaticParams() {
  return internationalProjects.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = internationalById(id);
  return { title: p ? `${p.title} — Internacional` : "Projeto internacional" };
}

export default async function ProjetoInternacional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = internationalById(id);
  if (!p) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/internacional" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HousePro Internacional
        </Link>

        <div className={`mt-4 flex aspect-[21/9] items-end rounded-2xl bg-gradient-to-br ${p.tint} p-6`}>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
              <MapPin className="size-4" /> {p.city}, {p.country} <span className="text-2xl">{p.flag}</span>
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">{p.title}</h1>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-display text-2xl">{eur.format(p.priceFrom)}<span className="text-sm font-normal text-muted-foreground"> · desde</span></span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-4" /> {p.typologies}</span>
          {p.deliveryYear && <span className="text-muted-foreground">Entrega {p.deliveryYear}</span>}
        </div>

        <p className="mt-5 text-muted-foreground">{p.description}</p>

        <h2 className="mt-8 font-display text-xl">Destaques</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {p.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {h}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border bg-card p-4">
          <Handshake className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Divulgação autorizada</p>
            <p className="text-sm text-muted-foreground">{p.partner}</p>
          </div>
        </div>

        {p.taxNote && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border bg-secondary/40 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Nota fiscal para o investidor português</p>
              <p className="text-sm text-muted-foreground">{p.taxNote}</p>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="flex items-center gap-2 font-display text-xl"><Globe2 className="size-5" /> Interessado neste projeto?</p>
          <p className="mt-1 text-sm opacity-90">
            Um consultor HousePro acompanha-o em todo o processo internacional — da reserva à escritura.
          </p>
          <Link href="/contacto" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium hover:bg-white/25">
            Falar com um consultor
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
