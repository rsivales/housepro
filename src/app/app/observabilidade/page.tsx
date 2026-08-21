import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import {
  listUnassignedMetaLeads,
  listAllMetaLeads,
  listLeadForms,
  getFieldMapping,
  getMetaConnection,
  countPendingApprovals,
  getWallet,
  listCallLogs,
  listEmailCampaigns,
} from "@/lib/db/repo";
import { overdueLeads } from "@/lib/meta/automations";
import { detectUnmappedQuestions } from "@/lib/meta/ingest";
import { usageLevel } from "@/lib/data/xmarket";
import { buildHealthSnapshot, worstSeverity, type Severity } from "@/lib/data/observability";
import { can } from "@/lib/data/permissions";

export const metadata: Metadata = { title: "Observabilidade Helix" };

const DOT: Record<Severity, string> = {
  ok: "bg-primary",
  warn: "bg-gold",
  crit: "bg-destructive",
};

export default async function ObservabilidadePage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  // Reporting/observabilidade é para gestão.
  if (!session.demo && !can(session.agent.roleKey, "view_reporting")) redirect("/app");

  const [unassigned, allLeads, forms, connection, pendingApprovals, wallet, calls, emails] =
    await Promise.all([
      listUnassignedMetaLeads(),
      listAllMetaLeads(),
      listLeadForms(),
      getMetaConnection(),
      countPendingApprovals(),
      getWallet(session.agent.id, session.agent.name),
      listCallLogs(session.agent.id),
      listEmailCampaigns(session.agent.id),
    ]);

  // Campos por mapear (soma sobre os formulários).
  let unmappedFields = 0;
  for (const f of forms) {
    const mapping = await getFieldMapping(f.id);
    unmappedFields += detectUnmappedQuestions(f, mapping).length;
  }

  const today = new Date().toISOString().slice(0, 10);
  const snapshot = buildHealthSnapshot({
    metaConnected: connection.status === "ligada",
    unassignedLeads: unassigned.length,
    slaOverdue: overdueLeads(allLeads).length,
    unmappedFields,
    pendingApprovals,
    lowCredits: wallet.credits.filter((c) => usageLevel(c).alert !== "ok").length,
    callsToday: calls.filter((c) => c.createdAt.slice(0, 10) === today).length,
    emailsSandbox: emails.filter((e) => e.status === "sandbox").length,
  });
  const worst = worstSeverity(snapshot);

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
          <Activity className="size-7 text-primary" /> Observabilidade
          <span className={`ml-1 inline-block size-3 rounded-full ${DOT[worst]}`} title={worst} />
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Sinais operacionais de todos os módulos, num só painel. O que está a
          vermelho ou amarelo precisa de atenção.{session.demo && " Dados de exemplo."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.map((p) => (
            <Link
              key={p.key}
              href={p.href ?? "#"}
              className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40"
            >
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${DOT[p.severity]}`} />
                <span className="text-xs font-medium text-muted-foreground">{p.label}</span>
              </div>
              <p className="mt-2 font-display text-2xl leading-none">{p.value}</p>
              {p.hint && <p className="mt-1 text-[11px] text-muted-foreground">{p.hint}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
