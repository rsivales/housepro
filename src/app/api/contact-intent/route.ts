import { NextResponse } from "next/server";

import { getPropertyById, getAgentPublicById, createLead } from "@/lib/db/repo";
import { notifyLead } from "@/lib/notify";
import { agentEmail } from "@/lib/format";
import { normalizeContactPhone } from "@/lib/phone";

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
  const clientPhone = normalizeContactPhone(body.clientPhone ? String(body.clientPhone) : "");
  const consent = body.consent === true;
  const objetivo = body.objetivo ? String(body.objetivo) : "";

  const identifiedCall = channel === "Chamada identificada";
  if ((channel === "Chamada" || identifiedCall) && (!clientPhone || !consent)) {
    // Nunca criar a antiga notificação anónima: um clique tel: não prova que
    // a chamada aconteceu e não fornece um contacto para retorno.
    return NextResponse.json({ error: "identified_phone_required" }, { status: 400 });
  }

  const property = propertyId ? await getPropertyById(propertyId) : undefined;
  const listingAgent = property?.agentId;
  const referrerId = ref && ref !== listingAgent ? ref : undefined;
  const ownerId = referrerId ?? listingAgent ?? ref ?? "";
  const owner = ownerId ? await getAgentPublicById(ownerId) : undefined;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";
  const propertyUrl = propertyId
    ? `${siteUrl}/imovel/${propertyId}${referrerId ? `?ref=${referrerId}` : ""}`
    : undefined;

  let lead;
  try {
    lead = await createLead({
      propertyId,
      propertyRef: property?.reference,
      ownerId: owner?.id ?? ownerId,
      referrerId,
      name: clientName || (identifiedCall ? "Pedido de chamada do website" : "Cliente do site"),
      contact: clientPhone || clientEmail || `(contacto via ${channel})`,
      email: clientEmail || undefined,
      intent: "mensagem",
      message: identifiedCall
        ? `Número registado antes de abrir o marcador para ${owner?.name ?? "o consultor"}. Deve ser contactado se a chamada não for atendida ou cair.`
        : `Contacto iniciado via ${channel}${objetivo ? ` · procura: ${objetivo}` : ""}`,
      source: "site",
      subSource: identifiedCall ? "Chamada identificada do website" : `Contacto via ${channel}`,
      pageUrl: body.pageUrl ? String(body.pageUrl).slice(0, 500) : propertyUrl,
      contactPreference: identifiedCall ? "telefone" : undefined,
      marketingConsent: false,
      consent: identifiedCall
        ? {
            base: "consentimento",
            at: new Date().toISOString(),
            text: "Tratamento do número para realizar e acompanhar este contacto; sem marketing.",
          }
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "persist_failed", retry: true }, { status: 503 });
  }

  const notified = await notifyLead(lead, {
    agentName: owner?.name,
    agentEmail: owner ? agentEmail(owner) : undefined,
    propertyRef: property?.reference,
    propertyUrl,
    channel: identifiedCall ? "Chamada do website — número identificado" : channel,
  });

  return NextResponse.json({ ok: true, id: lead.id, notified });
}
