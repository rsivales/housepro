import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { setOrderStatus } from "@/lib/db/repo";
import { can } from "@/lib/data/permissions";
import type { OrderStatus } from "@/lib/data/xmarket";

/**
 * X Market admin — aprova/rejeita/atualiza o estado de uma encomenda.
 *  PATCH { id, status }   (approve_expenses)
 */
const ALLOWED: OrderStatus[] = ["aprovada", "cancelada", "paga", "enviada", "entregue", "reembolsada"];

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const allowed = session.demo || can(session.agent.roleKey, "approve_expenses") || session.agent.role === "admin";
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão para aprovar despesas." }, { status: 403 });
  }

  let body: { id?: string; status?: OrderStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.id || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Faltam id ou estado válido." }, { status: 400 });
  }

  const ok = await setOrderStatus(String(body.id), body.status);
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
