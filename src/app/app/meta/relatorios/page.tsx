import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Users, Briefcase, Clock, Inbox, Route } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listAllMetaLeads, listCampaigns } from "@/lib/db/repo";
import { buildMetaReport, type SegmentReport } from "@/lib/meta/report";
import { automationSummary } from "@/lib/meta/automations";
import { CAMPAIGN_TYPE_LABEL } from "@/lib/data/meta";
import { agents } from "@/lib/data/mock";

export const metadata: Metadata = { title: "Relatórios — Meta e TikTok" };

export default async function RelatoriosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [leads, campaigns] = await Promise.all([listAllMetaLeads(), listCampaigns()]);
  const report = buildMetaReport(leads, campaigns);
  const sla = automationSummary(leads);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app/meta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Leads de campanhas
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <BarChart3 className="size-7 text-primary" /> Relatórios
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          O recrutamento é reportado <strong>à parte</strong> do comercial, para
          os números comerciais não ficarem inflacionados.
        </p>

        {/* SLA / automações */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <Clock className="size-4 text-primary" />
            <p className="mt-2 font-display text-2xl leading-none">{sla.slaOverdue}</p>
            <p className="mt-1 text-xs text-muted-foreground">Em atraso de 1.º contacto</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <Inbox className="size-4 text-primary" />
            <p className="mt-2 font-display text-2xl leading-none">{sla.unassignedAging}</p>
            <p className="mt-1 text-xs text-muted-foreground">Sem responsável há &gt; 24h</p>
          </div>
        </div>

        {/* Visão operacional comum a broker e superadmin. A RLS limita o âmbito. */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="flex items-center gap-2 font-medium">
              <BarChart3 className="size-4 text-primary" /> Leads captadas por plataforma
            </p>
            <div className="mt-4 space-y-3">
              {(["meta", "tiktok"] as const).map((provider) => {
                const count = report.byProvider[provider];
                const total = report.byProvider.meta + report.byProvider.tiktok;
                const width = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={provider}>
                    <div className="flex justify-between text-sm">
                      <span>{provider === "meta" ? "Meta · Facebook / Instagram" : "TikTok"}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="flex items-center gap-2 font-medium">
              <Clock className="size-4 text-primary" /> Tempo de resposta
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-xs text-muted-foreground">Média até 1.º contacto</dt>
                <dd className="mt-1 font-display text-xl">
                  {report.avgFirstResponseMinutes == null ? "—" : `${report.avgFirstResponseMinutes} min`}
                </dd>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-xs text-muted-foreground">Dentro do SLA de 24 h</dt>
                <dd className="mt-1 font-display text-xl">
                  {report.slaComplianceRate == null ? "—" : `${report.slaComplianceRate}%`}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <h2 className="mt-8 flex items-center gap-2 font-display text-xl">
          <Route className="size-5 text-primary" /> Encaminhamento das leads
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
          {report.byDestination.map((row) => {
            const name = row.agentId === "broker_inbox"
              ? "Inbox do broker · por distribuir"
              : agents.find((agent) => agent.id === row.agentId)?.name ?? `Consultor ${row.agentId.slice(0, 8)}`;
            return (
              <div key={row.agentId} className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-0">
                <span>{name}</span><strong>{row.count}</strong>
              </div>
            );
          })}
          {report.byDestination.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Ainda sem encaminhamentos.</p>
          )}
        </div>

        {/* Segmentos: comercial vs recrutamento */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SegmentCard title="Comercial" icon={Briefcase} data={report.commercial} />
          <SegmentCard title="Recrutamento" icon={Users} data={report.recruitment} />
        </div>

        {/* Por pipeline */}
        <h2 className="mt-8 font-display text-xl">Por pipeline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(report.byPipeline).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground"
            >
              {k}
              <span className="font-semibold text-foreground">{v}</span>
            </span>
          ))}
          {Object.keys(report.byPipeline).length === 0 && (
            <span className="text-sm text-muted-foreground">Sem leads.</span>
          )}
        </div>

        {/* Por campanha */}
        <h2 className="mt-8 font-display text-xl">Por campanha</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Campanha</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Leads</th>
                <th className="py-2 pr-3 font-medium">Qualif.</th>
                <th className="py-2 font-medium">S/ resp.</th>
              </tr>
            </thead>
            <tbody>
              {report.byCampaign.map((row) => (
                <tr key={row.campaignId} className="border-b last:border-0">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1">
                      {CAMPAIGN_TYPE_LABEL[row.type]}
                      {!row.isCommercial && (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          não comercial
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{row.count}</td>
                  <td className="py-2 pr-3">{row.qualified}</td>
                  <td className="py-2">{row.unassigned}</td>
                </tr>
              ))}
              {report.byCampaign.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sem campanhas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SegmentCard({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: typeof Users;
  data: SegmentReport;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-primary" /> {title}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Leads</dt>
        <dd className="text-right font-display text-lg">{data.total}</dd>
        <dt className="text-muted-foreground">Qualificadas</dt>
        <dd className="text-right">{data.qualified} ({data.qualifiedRate}%)</dd>
        <dt className="text-muted-foreground">Desqualificadas</dt>
        <dd className="text-right">{data.disqualified}</dd>
        <dt className="text-muted-foreground">Sem responsável</dt>
        <dd className="text-right">{data.unassigned}</dd>
        <dt className="text-muted-foreground">Score médio</dt>
        <dd className="text-right">{data.avgScore}</dd>
      </dl>
    </div>
  );
}
