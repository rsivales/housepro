import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { agencies, agentsByAgency, agentById } from "@/lib/data/mock";
import { listProperties, getAgenciesConfig } from "@/lib/db/repo";
import { getSession } from "@/lib/supabase/auth";
import { isBrandAdmin } from "@/lib/data/roles";
import { AgenciesAdmin } from "@/components/admin/agencies-admin";
import { AgencyTeamsReal } from "@/components/admin/agency-teams-real";

export const metadata: Metadata = { title: "Agências · Back office" };

export default async function AdminAgenciasPage() {
  const session = await getSession();
  // Gestão da rede: direção e acima. Coordenação vê o back office mas não gere agências.
  const canManage = Boolean(session && isBrandAdmin(session.agent));
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
          Cria, edita, suspende ou elimina agências da rede. As alterações são
          guardadas automaticamente. Abre uma agência para ver a equipa e os imóveis.
        </p>

        {/* Equipas reais — dados de login (profiles/agencies no Supabase). Atribui
            papéis (incluindo "Diretor de agência" = broker) e aprova/suspende o
            acesso de cada consultor. Distinto da lista abaixo (rede pública/marca). */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-xl">Equipas</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Quem entra de facto na HousePro, com o papel real (incluindo quem é o{" "}
          <strong>broker/diretor</strong> de cada agência) e o acesso ativo/suspenso.
        </p>
        <div className="mt-4">
          <AgencyTeamsReal />
        </div>

        <h2 className="mt-10 flex items-center gap-2 font-display text-xl">Rede pública (marca)</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Como a rede de agências aparece no site público — nome, região, estado. Não
          atribui consultores nem papéis (usa a secção Equipas acima para isso).
        </p>

        {canManage ? (
          <AgenciesAdmin base={base} initial={config} />
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-muted-foreground">
              A gestão da rede de agências está reservada à direção e super admin. Fala
              com a administração para obteres acesso.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
