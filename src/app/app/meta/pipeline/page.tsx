import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KanbanSquare } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listAllMetaLeads } from "@/lib/db/repo";
import { agents } from "@/lib/data/mock";
import { META_PIPELINES } from "@/lib/data/meta";
import type { Lead } from "@/lib/data/leads";
import { LeadKanban } from "@/components/meta/lead-kanban";

export const metadata: Metadata = { title: "Pipeline de leads — Meta CRM" };

export default async function PipelinePage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const all = await listAllMetaLeads();

  // Agrupar por pipeline (o de Recrutamento fica separado dos comerciais).
  const byPipeline: Record<string, Lead[]> = {};
  for (const p of META_PIPELINES) byPipeline[p.key] = [];
  for (const lead of all) {
    const key = lead.pipeline && byPipeline[lead.pipeline] ? lead.pipeline : "compradores";
    byPipeline[key].push(lead);
  }

  const agentNames: Record<string, string> = {};
  for (const a of agents) agentNames[a.id] = a.name;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/app/meta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Meta CRM
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <KanbanSquare className="size-7 text-primary" /> Pipeline de leads
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Quadro por fases das leads Meta já atribuídas. Compradores e
          proprietários são comerciais; o recrutamento fica num separador à parte.
          {session.demo && " Em demo, mover cartões não é guardado."}
        </p>

        <div className="mt-6">
          <LeadKanban leadsByPipeline={byPipeline} agentNames={agentNames} />
        </div>
      </div>
    </div>
  );
}
