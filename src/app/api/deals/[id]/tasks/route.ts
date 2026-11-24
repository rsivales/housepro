import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getDealGate } from "@/lib/db/deals";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
import { listDealTasks, seedDealTasks } from "@/lib/db/deal-tasks";

/** Checklist de um negócio. GET lista; POST aplica a checklist padrão
 *  (idempotente — não duplica tarefas já existentes). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { id: dealId } = await params;
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  const tasks = await listDealTasks(dealId);
  return NextResponse.json({ tasks });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { id: dealId } = await params;
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  const res = await seedDealTasks(dealId);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  const tasks = await listDealTasks(dealId);
  return NextResponse.json({ ...res, tasks });
}
