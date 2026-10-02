import { NextResponse } from "next/server";

import { propertyById, agentById } from "@/lib/data/mock";
import { createLead } from "@/lib/db/repo";
import { notifyLead } from "@/lib/notify";
import { agentEmail } from "@/lib/format";

/**
 * Recolhe uma lead do site (mensagem ou pedido de visita).
 *
 * Atribuição: se o cliente chegou através da página de um consultor (?ref),
 * é esse consultor que fica com o contacto — não o angariador do imóvel.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  const consent = Boolean(body.consent);
  const intent =
    body.intent === "visita"
      ? "visita"
      : body.intent === "custos"
        ? "custos"
        : "mensagem";
  const propertyId = body.propertyId ? String(body.propertyId) : undefined;
  const ref = body.ref ? String(body.ref) : undefined;

  if (!name || !contact) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  // Resolve o angariador do imóvel e aplica a atribuição por referência.
  const property = propertyId ? propertyById(propertyId) : undefined;
  const listingAgent = property?.agentId;
  const referrerId = ref && ref !== listingAgent ? ref : undefined;
  const ownerId = referrerId ?? listingAgent ?? ref ?? "";

  // Valida que o owner existe (evita atribuir a um id inválido).
  const owner = ownerId ? agentById(ownerId) : undefined;

  // Metadados de funil (origem/campanha) — sem dados pessoais nos analytics.
  const utm =
    body.utm && typeof body.utm === "object"
      ? (Object.fromEntries(
          Object.entries(body.utm as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, String(v)])
        ) as Record<string, string>)
      : undefined;
  const contactPreference =
    body.contactPreference === "whatsapp" || body.contactPreference === "email"
      ? body.contactPreference
      : body.contactPreference === "telefone"
        ? "telefone"
        : undefined;

  const lead = await createLead({
    propertyId,
    propertyRef: property?.reference,
    ownerId: owner?.id ?? ownerId,
    referrerId,
    name,
    contact,
    email: body.email ? String(body.email) : undefined,
    intent,
    message: body.message ? String(body.message) : undefined,
    preferredAt: body.preferredAt ? String(body.preferredAt) : undefined,
    source: "site",
    subSource: body.subSource ? String(body.subSource) : "Página de imóvel",
    pageUrl: body.pageUrl ? String(body.pageUrl) : undefined,
    referrerUrl: body.referrerUrl ? String(body.referrerUrl) : undefined,
    utm,
    contactPreference,
    marketingConsent: Boolean(body.marketingConsent),
    language: body.language ? String(body.language) : "pt",
    consent: { base: "consentimento", at: new Date().toISOString() },
  });

  // Notifica o consultor (best-effort; não bloqueia a resposta em caso de falha).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";
  const notified = await notifyLead(lead, {
    agentName: owner?.name,
    agentEmail: owner ? agentEmail(owner) : undefined,
    propertyRef: property?.reference,
    propertyUrl: propertyId
      ? `${siteUrl}/imovel/${propertyId}${referrerId ? `?ref=${referrerId}` : ""}`
      : undefined,
  });

  return NextResponse.json({
    ok: true,
    id: lead.id,
    owner: owner?.name ?? null,
    notified,
  });
}
