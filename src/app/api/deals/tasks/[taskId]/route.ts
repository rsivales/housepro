import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getDealGate } from "@/lib/db/deals";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
import {
  getTaskDealId,
  updateDealTaskStatus,
  type TaskStatus,
} from "@/lib/db/deal-tasks";

const STATUSES: TaskStatus[] = [
  "pending",
  "requested",
  "received",
  "in_review",
  "validated",
  "rejected",
  "waived",
];

/** Muda o estado de uma tarefa da checklist (validar/rejeitar/dispensar/pedir).
 *  Só equipa do negócio ou staff — nunca o próprio cliente (fase 2 dará ao
 *  comprador/vendedor uma rota à parte, limitada a "enviar documento"). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { taskId } = await params;
  const dealId = await getTaskDealId(taskId);
  if (!dealId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  let body: {
    status?: string;
    waiverReason?: string;
    dueAt?: string | null;
    ownerId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.status || !STATUSES.includes(body.status as TaskStatus))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const res = await updateDealTaskStatus(taskId, session.agent.id, {
    status: body.status as TaskStatus,
    waiverReason: body.waiverReason,
    dueAt: "dueAt" in body ? body.dueAt ?? null : undefined,
    ownerId: "ownerId" in body ? body.ownerId ?? null : undefined,
  });
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
