import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { agencies, agentsByAgency, agentById } from "@/lib/data/mock";
import { listProperties, getAgenciesConfig } from "@/lib/db/repo";
import { AgenciesAdmin } from "@/components/admin/agencies-admin";

export const metadata: Metadata = { title: "Agências · Back office" };

export default async function AdminAgenciasPage() {
  const config = await getAgenciesConfig();
  const all = await listProperties();
  // Contagem de imóveis por agência (via agência do angariador).
  const counts = new Map<string, number>();
  for (const p of all) {
    const ag = agentById(p.agentId).agencyId;
    if (ag) counts.set(ag, (counts.get(ag) ?? 0) + 1);
  }

  const base = agencies.map((a) => ({
    id: a.id,
    name: a.name,
    region: a.region,
    slug: a.slug,
    code: a.code ?? 0,
    propertyCount: counts.get(a.id) ?? 0,
    team: agentsByAgency(a.id).map((m) => ({ id: m.id, name: m.name, role: m.role, photo: m.photo ?? null, accent: m.accent })),
  }));

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Building2 className="size-7 text-primary" /> Agências
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cria, renomeia e consulta as agências da rede. Abre uma agência para ver a
          equipa, o número de imóveis e os dados de identificação.
        </p>

        <AgenciesAdmin base={base} initial={config} />
      </main>
    </div>
  );
}
