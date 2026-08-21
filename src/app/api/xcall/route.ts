import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { logCall } from "@/lib/db/repo";
import type { CallScriptKey, CallResult, CallTemperature } from "@/lib/data/xcall";

/**
 * X Call — regista o resultado de uma chamada e propaga (cronologia, próxima
 * tarefa, estado da lead). Em demo devolve o objeto sem persistir.
 *  POST { scriptKey, result, contactId?, contactName?, leadId?, objective?,
 *         temperature?, score?, notes?, nextTaskTitle?, nextTaskDueAt?, lostReason? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    scriptKey?: CallScriptKey;
    result?: CallResult;
    contactId?: string;
    contactName?: string;
    leadId?: string;
    objective?: string;
    temperature?: CallTemperature;
    score?: number;
    notes?: string;
    nextTaskTitle?: string;
    nextTaskDueAt?: string;
    lostReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.result || !body.scriptKey) {
    return NextResponse.json({ error: "Faltam scriptKey ou resultado." }, { status: 400 });
  }

  const call = await logCall({
    agentId: session.agent.id,
    agentName: session.agent.name,
    contactId: body.contactId,
    contactName: body.contactName,
    leadId: body.leadId,
    scriptKey: body.scriptKey,
    objective: body.objective,
    result: body.result,
    temperature: body.temperature,
    score: typeof body.score === "number" ? body.score : undefined,
    notes: body.notes,
    nextTaskTitle: body.nextTaskTitle,
    nextTaskDueAt: body.nextTaskDueAt,
    lostReason: body.lostReason,
  });
  return NextResponse.json({ call, demo: session.demo });
}
