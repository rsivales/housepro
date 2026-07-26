import { NextResponse } from "next/server";

import { propertyById, agentById } from "@/lib/data/mock";
import { createLead } from "@/lib/db/repo";
import { notifyLead } from "@/lib/notify";
import { agentEmail } from "@/lib/format";

/**
 * Regista e notifica um contacto iniciado pelo cliente por WhatsApp / SMS /
 * chamada a partir da página de um imóvel. Envia cópia por email ao consultor
 * e à direção da agência (LEAD_NOTIFY_EMAIL), com o link do imóvel.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const propertyId = body.propertyId ? String(body.propertyId) : undefined;
  const ref = body.ref ? String(body.ref) : undefined;
  const channel = String(body.channel ?? "contacto");
  const clientName = body.clientName ? String(body.clientName) : "";
  const clientEmail = body.clientEmail ? String(body.clientEmail) : "";
  const objetivo = body.objetivo ? String(body.objetivo) : "";

  const property = propertyId ? propertyById(propertyId) : undefined;
  const listingAgent = property?.agentId;
  const referrerId = ref && ref !== listingAgent ? ref : undefined;
  const ownerId = referrerId ?? listingAgent ?? ref ?? "";
  const owner = ownerId ? agentById(ownerId) : undefined;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";
  const propertyUrl = propertyId
    ? `${siteUrl}/imovel/${propertyId}${referrerId ? `?ref=${referrerId}` : ""}`
    : undefined;

  const lead = await createLead({
    propertyId,
    ownerId: owner?.id ?? ownerId,
    referrerId,
    name: clientName || "Cliente do site",
    contact: clientEmail || `(contacto via ${channel})`,
    email: clientEmail || undefined,
    intent: "mensagem",
    message: `Contacto iniciado via ${channel}${objetivo ? ` · procura: ${objetivo}` : ""}`,
    source: "site",
  });

  const notified = await notifyLead(lead, {
    agentName: owner?.name,
    agentEmail: owner ? agentEmail(owner) : undefined,
    propertyRef: property?.reference,
    propertyUrl,
    channel,
  });

  return NextResponse.json({ ok: true, id: lead.id, notified });
}
