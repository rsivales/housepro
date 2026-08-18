import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Megaphone,
  FileText,
  Share2,
  AtSign,
  ListChecks,
  Users,
} from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listCampaigns, getMetaConnection } from "@/lib/db/repo";
import {
  CAMPAIGN_TYPE_LABEL,
  CAMPAIGN_STATUS,
  META_CONNECTION_STATUS,
  isCommercialCampaign,
} from "@/lib/data/meta";
import { TestLeadButton } from "@/components/meta/test-lead-button";

export const metadata: Metadata = { title: "Meta CRM — campanhas e leads" };

export default async function MetaPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [campaigns, connection] = await Promise.all([
    listCampaigns(),
    getMetaConnection(),
  ]);

  const conn = META_CONNECTION_STATUS[connection.status];
  const comerciais = campaigns.filter((c) => isCommercialCampaign(c.type));
  const recrutamento = campaigns.filter((c) => c.type === "RECRUITMENT");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Megaphone className="size-7 text-primary" /> Meta CRM
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Campanhas de Facebook e Instagram, formulários de leads e distribuição
          pelos consultores. {session.demo && "Dados de exemplo (modo demonstração)."}
        </p>

        {/* Ligação Meta */}
        <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-secondary">
                <Share2 className="size-5 text-primary" />
              </span>
              <div>
                <p className="font-medium leading-tight">{connection.pageName}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {connection.igName && (
                    <>
                      <AtSign className="size-3.5" /> {connection.igName}
                    </>
                  )}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${conn.badge}`}
            >
              <span className={`size-2 rounded-full ${conn.dot}`} /> {conn.label}
            </span>
          </div>
          {connection.status === "demo" && (
            <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              Nenhuma conta Meta ligada. Os tokens de acesso nunca ficam no
              browser nem no repositório — a ligação real faz-se no servidor
              (Fase C). Podes explorar todo o fluxo com os dados de exemplo.
            </p>
          )}
        </div>

        {/* Navegação do módulo */}
        <div className="mt-6 flex flex-wrap gap-2">
          <SectionChip icon={Megaphone} label="Campanhas" href="/app/meta/campanhas" />
          <SectionChip icon={FileText} label="Formulários & mapeamento" href="/app/meta/formularios" />
        </div>

        {/* Simular receção de lead (demo) */}
        <div className="mt-4">
          <TestLeadButton
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>

        {/* Resumo */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Campanhas" value={campaigns.length} icon={Megaphone} />
          <Stat label="Comerciais" value={comerciais.length} icon={ListChecks} />
          <Stat label="Recrutamento" value={recrutamento.length} icon={Users} />
          <Stat label="Ativas" value={campaigns.filter((c) => c.status === "ativa").length} icon={ListChecks} />
        </div>

        {/* Campanhas */}
        <h2 className="mt-8 font-display text-xl">Campanhas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {campaigns.map((c) => {
            const st = CAMPAIGN_STATUS[c.status];
            return (
              <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-tight">{c.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.badge}`}>
                    {st.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                    {CAMPAIGN_TYPE_LABEL[c.type]}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {c.ownerType === "AGENCY" ? "Agência" : "Consultor"}: {c.ownerName ?? c.ownerId}
                  </span>
                </div>
                {c.responsibleName && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Responsável: {c.responsibleName}
                  </p>
                )}
                {c.objective && (
                  <p className="mt-1 text-xs text-muted-foreground">{c.objective}</p>
                )}
              </div>
            );
          })}
          {campaigns.length === 0 && (
            <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground sm:col-span-2">
              Sem campanhas. Cria a primeira em “Campanhas”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionChip({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Megaphone;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary"
    >
      <Icon className="size-4 text-primary" /> {label}
    </Link>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Megaphone;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 font-display text-2xl leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
