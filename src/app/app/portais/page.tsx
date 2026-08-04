import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listPropertiesByAgent } from "@/lib/db/repo";
import { PortalExports } from "@/components/consultant/portal-exports";

export const metadata: Metadata = { title: "Portais & exportações" };

export default async function PortaisPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const mine = await listPropertiesByAgent(agent.id);
  const count = mine.filter((p) => !p.approval || p.approval === "aprovado").length;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Share2 className="size-7 text-primary" /> Portais & exportações
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Publica os teus imóveis no Idealista, Imovirtual, Casa Sapo e Facebook/Meta
          através de feeds automáticos — configura cada portal e cola o URL do feed.
        </p>

        <PortalExports agentId={agent.id} count={count} />
      </div>
    </div>
  );
}
