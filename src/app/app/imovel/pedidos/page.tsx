import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert, Users } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listPendingAgentRequests } from "@/lib/db/agent-requests";
import { AgentRequestQueue } from "@/components/property/agent-request-queue";

export const metadata: Metadata = { title: "Pedidos de angariação" };

export default async function PedidosAngariacaoPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const canManage = isStaff(session.agent);
  const pending = canManage ? await listPendingAgentRequests() : [];

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Users className="size-7 text-primary" /> Pedidos de angariação
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Consultores pedem para entrar (co-angariar) num imóvel. Ao aprovar, o consultor passa a
          co-angariador e o lead/contacto fica partilhado.
        </p>

        <div className="mt-6">
          {canManage ? (
            <AgentRequestQueue initial={pending} />
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p className="text-muted-foreground">
                A aprovação de co-angariação está reservada à coordenação, direção/broker e administração.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
