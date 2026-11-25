import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listPropostasBoard } from "@/lib/db/deal-offers";
import { PropostasBoard } from "@/components/app/propostas-board";

export const metadata: Metadata = { title: "Propostas · Helix" };

export default async function PropostasPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const staff = isStaff(session.agent);
  const rows = await listPropostasBoard(session.agent.id, staff, {
    agencyId: session.agent.agencyId,
    global: ["superadmin", "admin"].includes(session.agent.roleKey ?? ""),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-primary">Área do consultor</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl">Propostas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Registo de propostas e contrapropostas por negócio — para ver o estado e agir, entre no negócio.
      </p>
      <div className="mt-6">
        <PropostasBoard rows={rows} />
      </div>
    </div>
  );
}
