import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Globe2, Handshake, Info, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { publicInternationalProjects } from "@/lib/db/international";
import { ProjectFacts, ProjectImage } from "@/components/international/project-facts";
import { InterestForm } from "@/components/projects/interest-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = (await publicInternationalProjects()).find((project) => project.id === id);
  return { title: p ? `${p.title} — Internacional` : "Projeto internacional" };
}

export default async function ProjetoInternacional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await publicInternationalProjects()).find((project) => project.id === id);
  if (!p) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/internacional" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HousePro Internacional
        </Link>

        <header className="mt-6">
          <ProjectImage project={p} className="mb-6 max-h-[560px] w-full object-cover" eager />
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" /> {p.city}, {p.country}</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{p.title}</h1>
          {p.developer && <p className="mt-2 text-sm text-muted-foreground">{p.developer}</p>}
        </header>
        <div className="mt-6"><ProjectFacts project={p} all /></div>
        {p.brochure && <a href={p.brochure} className="mt-4 inline-block text-sm font-medium underline">Consultar brochura</a>}

        <p className="mt-5 text-muted-foreground">{p.description}</p>

        {!!p.highlights.length && <>
        <h2 className="mt-8 font-display text-xl">Destaques</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {p.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {h}
            </li>
          ))}
        </ul>
        </>}

        {p.partner && <div className="mt-6 flex items-start gap-2 rounded-2xl border bg-card p-4">
          <Handshake className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Divulgação autorizada</p>
            <p className="text-sm text-muted-foreground">{p.partner}</p>
          </div>
        </div>}

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
          <InterestForm kind="international" projectId={p.id} projectName={p.title} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
