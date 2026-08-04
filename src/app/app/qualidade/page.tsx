import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listQualityEvents } from "@/lib/db/repo";
import { demoQualityEvents, type QualityEvent } from "@/lib/data/quality";
import { earnedPrizes } from "@/lib/data/prizes";
import { getMonthlyGross } from "@/lib/db/repo";
import { QualityBoard } from "@/components/quality/quality-board";

export const metadata: Metadata = { title: "Qualidade — reputação" };

export default async function QualidadePage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const real = await listQualityEvents(agent.id);
  const events: QualityEvent[] = real.length
    ? real
    : demoQualityEvents.map((e) => ({ ...e, agentId: agent.id }));

  // Base de méritos: gamificação já conquistada conta como reputação positiva.
  const faturacao = await getMonthlyGross(agent.id);
  const meritBase = earnedPrizes(faturacao || 42000, "faturacao").length * 25;

  const roleKey = agent.roleKey ?? "";
  const canManage = ["coordenador", "diretor", "admin"].includes(roleKey) || agent.role === "admin";

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Scale className="size-7 text-primary" /> Qualidade
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A tua reputação profissional: <strong>méritos</strong> somam,{" "}
          <strong>infrações</strong> confirmadas descontam pontos e geram uma
          penalização que compensa no próximo acerto de comissão. Toda a infração
          tem <strong>devido processo</strong> — é proposta, podes contestar, e só
          a coordenação/direção confirma ou anula.
        </p>

        <QualityBoard
          initial={events}
          meritBase={meritBase}
          agentId={agent.id}
          agentName={agent.name}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
