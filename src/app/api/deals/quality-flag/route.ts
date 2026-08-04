import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { insertQualityInfraction, insertNotifications } from "@/lib/db/repo";
import { notifyGeneric } from "@/lib/notify";

/**
 * CRM → Qualidade: sinaliza automaticamente para o módulo Qualidade quando um
 * item VITAL do checklist de escritura fica fora do prazo. Cria uma infração
 * "proposta" (categoria atraso) contra o responsável do processo — que pode
 * contestar em devido processo antes de a coordenação confirmar ou anular.
 *
 * Idempotente: a mesma ocorrência (agente + negócio + categoria por decidir)
 * não é duplicada.
 *
 * POST { dealRef, agentId, agentName?, items: string[] }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { dealRef?: string; agentId?: string; agentName?: string; items?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const dealRef = String(body.dealRef ?? "").trim();
  const agentId = String(body.agentId ?? "").trim();
  const items = (body.items ?? []).filter(Boolean);
  if (!agentId || items.length === 0) {
    return NextResponse.json({ ok: true, flagged: false });
  }

  // Vários itens vitais em atraso → severidade média; um só → leve.
  const severity = items.length >= 2 ? "media" : "leve";
  const reason = `Item(ns) vital(is) fora do prazo na escritura (${dealRef || "negócio"}): ${items.join("; ")}`;

  const created = await insertQualityInfraction({
    agentId, severity, category: "atraso", reason,
    dealRef, createdBy: session.agent.id,
  });

  if (created) {
    await insertNotifications([{
      userId: agentId, type: "qualidade",
      title: "Atraso vital sinalizado à Qualidade",
      body: reason, href: "/app/qualidade",
    }]);
    await notifyGeneric({
      subject: `HousePro — Qualidade: atraso vital em ${dealRef || "negócio"}`,
      text: `${reason}\n\nFoi aberta uma infração proposta. ${body.agentName ?? "O consultor"} pode contestar em /app/qualidade.\n\n— HousePro`,
    });
  }

  return NextResponse.json({ ok: true, flagged: created, severity });
}
