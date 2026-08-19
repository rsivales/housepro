import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createTask, setTaskDone } from "@/lib/db/repo";
import type { TaskKind, TaskPriority } from "@/lib/data/contacts";

/**
 * Tarefas do consultor.
 *  POST  { title, kind, priority?, contactId?, contactName?, dueAt? } → cria.
 *  PATCH { id, done } → marca/desmarca como feita.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    title?: string;
    kind?: TaskKind;
    priority?: TaskPriority;
    contactId?: string;
    contactName?: string;
    dueAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.title) return NextResponse.json({ error: "O título é obrigatório." }, { status: 400 });

  const task = await createTask({
    ownerId: session.agent.id,
    title: String(body.title),
    kind: body.kind ?? "other",
    priority: body.priority,
    contactId: body.contactId,
    contactName: body.contactName,
    dueAt: body.dueAt,
  });
  return NextResponse.json({ task, demo: session.demo });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { id?: string; done?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.id || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Faltam id ou done." }, { status: 400 });
  }
  const ok = await setTaskDone(String(body.id), body.done);
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
