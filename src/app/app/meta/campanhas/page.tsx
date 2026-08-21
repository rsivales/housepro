import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listCampaigns } from "@/lib/db/repo";
import { agents, agencies } from "@/lib/data/mock";
import { CampaignsManager } from "@/components/meta/campaigns-manager";

export const metadata: Metadata = { title: "Campanhas — Meta CRM" };

export default async function CampanhasPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const campaigns = await listCampaigns();

  // Opções para os seletores (dono/responsável). Consultores e advogados/superadmin
  // ficam de fora das opções de responsável comercial.
  const agentOptions = agents
    .filter((a) => a.roleKey !== "superadmin" && a.roleKey !== "advogado")
    .map((a) => ({ id: a.id, name: `${a.name} · ${a.agency}` }));
  const agencyOptions = agencies.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app/meta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Meta CRM
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Megaphone className="size-7 text-primary" /> Campanhas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cada campanha tem um <strong>dono</strong> (agência ou consultor) e um{" "}
          <strong>responsável</strong> pela gestão. O tipo define o pipeline
          sugerido (compradores, proprietários ou recrutamento).
          {session.demo && " As campanhas criadas em demo não são guardadas."}
        </p>

        <div className="mt-6">
          <CampaignsManager
            initial={campaigns}
            agencies={agencyOptions}
            agents={agentOptions}
          />
        </div>
      </div>
    </div>
  );
}
