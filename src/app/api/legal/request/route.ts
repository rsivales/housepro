import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { insertNotifications } from "@/lib/db/repo";
import { notifyGeneric } from "@/lib/notify";
import { agents } from "@/lib/data/mock";
import { DOC_TYPE_LABEL, type LegalDocType } from "@/lib/data/legalflow";

/**
 * Pedido de serviço jurídico ao advogado — notifica-o na app e por email sempre
 * que há um pedido novo. Best-effort (não bloqueia). Em demo não persiste.
 *  POST { type, propertyRef?, note? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { type?: LegalDocType; propertyRef?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.type) return NextResponse.json({ error: "Falta o tipo de documento." }, { status: 400 });

  const lawyer = agents.find((a) => a.roleKey === "advogado");
  const typeLabel = DOC_TYPE_LABEL[body.type] ?? "Documento";

  // Email ao advogado (best-effort).
  await notifyGeneric({
    subject: `Novo pedido jurídico — ${typeLabel}`,
    text: [
      `Novo pedido de ${typeLabel}.`,
      body.propertyRef ? `Imóvel: ${body.propertyRef}` : null,
      `Consultor: ${session.agent.name}`,
      body.note ? `Nota: ${body.note}` : null,
      "Abre o LegalFlow para tratar.",
    ]
      .filter(Boolean)
      .join("\n"),
    to: lawyer?.email ? [lawyer.email] : undefined,
  });

  // Notificação na app do advogado.
  if (lawyer) {
    await insertNotifications([
      {
        userId: lawyer.id,
        type: "legal_request",
        title: `Novo pedido — ${typeLabel}`,
        body: `${session.agent.name}${body.propertyRef ? ` · ${body.propertyRef}` : ""}`,
        href: "/app/legalflow",
      },
    ]);
  }

  return NextResponse.json({ ok: true, demo: session.demo });
}
