import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScrollText, ShieldAlert } from "lucide-react";

import { agencies as baseAgencies } from "@/lib/data/mock";
import { mergeAgencies } from "@/lib/data/agencies";
import { getAgenciesConfig, getAgencyLegalConfig } from "@/lib/db/repo";
import { getSession } from "@/lib/supabase/auth";
import { isBrandAdmin } from "@/lib/data/roles";
import { AgencyLegalManager } from "@/components/admin/agency-legal-manager";

export const metadata: Metadata = { title: "Dados legais da agência · Back office" };

export default async function AgenciaLegalPage() {
  const session = await getSession();
  const canManage = Boolean(session && isBrandAdmin(session.agent));

  const cfg = await getAgenciesConfig();
  const removed = new Set(cfg.removed ?? []);
  // Todas as agências da rede exceto as eliminadas (inclui suspensas).
  const list = mergeAgencies(baseAgencies, cfg, { includeHidden: true })
    .filter((a) => !removed.has(a.id))
    .map((a) => ({ id: a.id, name: a.name, region: a.region }));
  const initial = canManage ? await getAgencyLegalConfig() : {};

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Administração
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <ScrollText className="size-7 text-primary" /> Dados legais da agência
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configuração <strong>obrigatória</strong> de cada agência de mediação: licença
          AMI e comprovativo, certidões da empresa, registo comercial e seguro. As
          alterações são guardadas automaticamente. Enquanto estiver incompleta, a
          agência fica assinalada como não conforme.
        </p>

        {canManage ? (
          <AgencyLegalManager agencies={list} initial={initial} />
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-muted-foreground">
              Os dados legais das agências são geridos pela direção e super admin. Fala com
              a administração para obteres acesso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
