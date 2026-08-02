import { NextResponse } from "next/server";

import { propertyById, agentById } from "@/lib/data/mock";
import { docStatus, docLabel } from "@/lib/imovel/model";
import { agentEmail } from "@/lib/format";
import { notifyGeneric } from "@/lib/notify";

/**
 * Notifica o agente (e a direção) de que um imóvel foi revisto mas tem
 * documentos/correções em falta, para ele corrigir. Enviado da fila de aprovações.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const propertyId = body.propertyId ? String(body.propertyId) : "";
  const property = propertyId ? propertyById(propertyId) : undefined;
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const agent = agentById(property.agentId);
  const st = docStatus(property.documents ?? [], property.sellerType === "empresa");
  const missing = st.missing.map(docLabel);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";
  const url = `${siteUrl}/imovel/${property.id}`;

  const text = [
    `Imóvel ${property.reference} — ${property.title}`,
    "",
    "Foi revisto pela administração e ainda faltam documentos/correções:",
    ...missing.map((m) => `• ${m}`),
    "",
    "Por favor, carregue/corrija para avançar a publicação.",
    `Imóvel: ${url}`,
  ].join("\n");

  const notified = await notifyGeneric({
    subject: `Documentos em falta · ${property.reference}`,
    text,
    to: [agent ? agentEmail(agent) : undefined, process.env.LEAD_NOTIFY_EMAIL],
  });

  return NextResponse.json({ ok: true, notified, missing });
}
