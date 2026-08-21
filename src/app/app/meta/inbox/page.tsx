import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listUnassignedMetaLeads, listCampaigns } from "@/lib/db/repo";
import { agents } from "@/lib/data/mock";
import { LeadInbox } from "@/components/meta/lead-inbox";

export const metadata: Metadata = { title: "Leads sem responsável — Meta CRM" };

export default async function InboxPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [leads, campaigns] = await Promise.all([
    listUnassignedMetaLeads(),
    listCampaigns(),
  ]);

  const agentOptions = agents
    .filter((a) => a.roleKey !== "superadmin" && a.roleKey !== "advogado")
    .map((a) => ({ id: a.id, name: `${a.name} · ${a.agency}` }));
  const campaignName: Record<string, string> = {};
  for (const c of campaigns) campaignName[c.id] = c.name;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app/meta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Meta CRM
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Inbox className="size-7 text-primary" /> Leads sem responsável
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Leads captadas que ainda não têm consultor. Cada uma tem de ser
          atribuída a um <strong>consultor específico</strong> para entrar no
          pipeline. {session.demo && "Em demo, as ações não são guardadas."}
        </p>

        <div className="mt-6">
          <LeadInbox
            initial={leads}
            agents={agentOptions}
            campaignName={campaignName}
          />
        </div>
      </div>
    </div>
  );
}
