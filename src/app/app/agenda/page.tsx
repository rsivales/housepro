import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listTasksByOwner, listVisitsByOwner } from "@/lib/db/repo";
import { AgendaBoard } from "@/components/crm/agenda-board";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [tasks, visits] = await Promise.all([
    listTasksByOwner(session.agent.id),
    listVisitsByOwner(session.agent.id),
  ]);

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
          <CalendarClock className="size-7 text-primary" /> Agenda
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          As tuas tarefas e visitas num só lugar.
          {session.demo && " Dados de exemplo."}
        </p>

        <div className="mt-6">
          <AgendaBoard initialTasks={tasks} visits={visits} />
        </div>
      </div>
    </div>
  );
}
