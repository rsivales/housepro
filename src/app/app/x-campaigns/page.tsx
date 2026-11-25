import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listEmailCampaigns, listEmailLists } from "@/lib/db/repo";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { CampaignStudio } from "@/components/xcampaigns/campaign-studio";

export const metadata: Metadata = { title: "X Campaigns — email marketing" };

export default async function XCampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [campaigns, lists, delivery] = await Promise.all([
    listEmailCampaigns(session.agent.id),
    listEmailLists(session.agent.id),
    emailDeliveryCredentials(),
  ]);
  const emailEnabled = delivery.enabled && Boolean(delivery.sender) && Boolean(delivery.apiKey);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Mail className="size-7 text-primary" /> X Campaigns
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Email marketing integrado com o CRM: blocos, personalização, segmentação
          e envio {emailEnabled ? "real (Resend) ou em sandbox" : "em sandbox"}.
          {!emailEnabled && " Nenhum email real é enviado sem credenciais configuradas."}
          {session.demo && " Dados de exemplo."}
        </p>

        <div className="mt-6">
          <CampaignStudio initial={campaigns} initialLists={lists} emailEnabled={emailEnabled} />
        </div>
      </div>
    </div>
  );
}
