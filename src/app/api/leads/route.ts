import { NextResponse } from "next/server";

import { propertyById, agentById } from "@/lib/data/mock";
import { createLead } from "@/lib/db/repo";

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
  const intent = body.intent === "visita" ? "visita" : "mensagem";
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

  const lead = await createLead({
    propertyId,
    ownerId: owner?.id ?? ownerId,
    referrerId,
    name,
    contact,
    email: body.email ? String(body.email) : undefined,
    intent,
    message: body.message ? String(body.message) : undefined,
    preferredAt: body.preferredAt ? String(body.preferredAt) : undefined,
    source: "site",
  });

  return NextResponse.json({ ok: true, id: lead.id, owner: owner?.name ?? null });
}
