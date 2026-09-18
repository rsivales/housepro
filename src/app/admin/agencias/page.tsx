import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { listAllPropertiesAdmin, listAgenciesReal, listActiveAgentsByAgency } from "@/lib/db/repo";
import { getSession } from "@/lib/supabase/auth";
import { isBrandAdmin } from "@/lib/data/roles";
import { AgenciesAdmin } from "@/components/admin/agencies-admin";
import { AgencyTeamsReal } from "@/components/admin/agency-teams-real";

export const metadata: Metadata = { title: "Agências · Back office" };

export default async function AdminAgenciasPage() {
  const session = await getSession();
  // Gestão da rede: direção e acima. Coordenação vê o back office mas não gere agências.
  const canManage = Boolean(session && isBrandAdmin(session.agent));
  const agencies = await listAgenciesReal({ includeHidden: true });
  const all = await listAllPropertiesAdmin();

  // Contagem de imóveis por agência (via agência do angariador) + equipa ativa.
  const counts = new Map<string, number>();
  for (const p of all) {
    const ag = p.agent?.agencyId;
    if (ag) counts.set(ag, (counts.get(ag) ?? 0) + 1);
  }
  const base = await Promise.all(
    agencies.map(async (a) => {
      const team = await listActiveAgentsByAgency(a.id);
      return {
        ...a,
        propertyCount: counts.get(a.id) ?? 0,
        team: team.map((m) => ({ id: m.id, name: m.name, role: m.role, photo: m.photo ?? null, accent: m.accent })),
      };
    })
  );

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
          guardadas automaticamente. Abre uma agência para ver a equipa e a ficha pública.
        </p>

        {/* Equipas reais — dados de login (profiles/agencies no Supabase). Atribui
            papéis (incluindo "Diretor de agência" = broker) e aprova/suspende o
            acesso de cada consultor. Mesma tabela real usada abaixo. */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-xl">Equipas</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Quem entra de facto na HousePro, com o papel real (incluindo quem é o{" "}
          <strong>broker/diretor</strong> de cada agência) e o acesso ativo/suspenso.
        </p>
        <div className="mt-4">
          <AgencyTeamsReal />
        </div>

        <h2 className="mt-10 flex items-center gap-2 font-display text-xl">Rede de agências</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cada agência é juridicamente independente e responsável pela sua própria
          gestão. Aqui geres a rede (nome, região, abrir/suspender) e a ficha
          pública de cada uma (serviços, notícias, o que mostrar na montra, dados legais).
        </p>

        {canManage ? (
          <AgenciesAdmin base={base} isNetworkAdmin={session ? isBrandAdmin(session.agent) && session.agent.roleKey !== "diretor" : false} />
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
