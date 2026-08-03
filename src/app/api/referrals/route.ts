import { NextResponse } from "next/server";

import { agentById, agencyById, propertyById } from "@/lib/data/mock";
import {
  MIN_CLIENTE_PCT,
  MIN_CONSULTOR_PCT,
  agencyForMunicipality,
  type Referral,
} from "@/lib/data/referrals";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Referências (partilha de leads), sempre em percentagem.
 *  POST  → cria (consultor→consultor, ou cliente→agência da zona)
 *  PATCH → destino aceita / rejeita / contrapõe (aceitação mútua = ativa)
 * Grava no Supabase quando configurado; caso contrário devolve o objeto
 * (modo demo) para o fluxo ser testável ponta a ponta.
 */

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = body.type === "cliente" ? "cliente" : "consultor";
  const clientName = String(body.clientName ?? "").trim();
  const clientContact = String(body.clientContact ?? "").trim();
  const consent = Boolean(body.consent);
  const min = type === "cliente" ? MIN_CLIENTE_PCT : MIN_CONSULTOR_PCT;
  const sharePct = Math.max(min, Number(body.sharePct) || min);

  if (!clientName || !clientContact) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const propertyId = body.propertyId ? String(body.propertyId) : undefined;
  const property = propertyId ? propertyById(propertyId) : undefined;

  let toId: string | undefined;
  let toName: string | undefined;
  let agencyId: string | undefined;
  let agencyName: string | undefined;
  let fromId: string;
  let fromName: string;

  if (type === "consultor") {
    fromId = String(body.fromId ?? "");
    fromName = fromId ? agentById(fromId).name : "Consultor";
    if (body.international) {
      // Destino internacional: não é um agente do sistema; guarda-se o nome.
      toId = undefined;
      toName = String(body.toName ?? "").trim() || "Consultor internacional";
    } else {
      // Destino: consultor indicado ou o angariador do imóvel.
      toId = body.toId ? String(body.toId) : property?.agentId;
      toName = toId ? agentById(toId).name : undefined;
    }
    if (!fromId || (!toId && !body.international)) {
      return NextResponse.json({ error: "missing_parties" }, { status: 400 });
    }
  } else {
    // Cliente → distribuída pela agência da zona geográfica.
    fromId = "cliente";
    fromName = `Cliente: ${String(body.fromName ?? clientName)}`;
    const municipality = String(body.municipality ?? property?.municipality ?? "");
    agencyId = String(body.agencyId ?? agencyForMunicipality(municipality));
    agencyName = agencyById(agencyId)?.name;
  }

  const referral: Referral = {
    id: `ref-${Date.now()}`,
    type,
    propertyId,
    propertyRef: property?.reference,
    propertyTitle: property?.title,
    fromId,
    fromName,
    fromContact: body.fromContact ? String(body.fromContact) : undefined,
    purpose: body.purpose === "vender" ? "vender" : body.purpose === "comprar" ? "comprar" : undefined,
    toId,
    toName,
    agencyId,
    agencyName,
    clientName,
    clientContact,
    sharePct,
    international: Boolean(body.international),
    country: body.country ? String(body.country) : undefined,
    taxNote: body.taxNote ? String(body.taxNote) : undefined,
    proposedBy: "origem",
    note: body.note ? String(body.note) : undefined,
    status: "pendente",
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("referrals").insert({
        type: referral.type,
        property_id: referral.propertyId ?? null,
        from_id: referral.type === "consultor" ? referral.fromId : null,
        to_id: referral.toId ?? null,
        agency_id: referral.agencyId ?? null,
        client_name: referral.clientName,
        client_contact: referral.clientContact,
        share_pct: referral.sharePct,
        note: referral.note ?? null,
        status: referral.status,
      });
    } catch {
      /* best-effort no protótipo */
    }
  }

  return NextResponse.json({ ok: true, referral });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id || !["accept", "reject", "counter"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  let status: Referral["status"];
  let sharePct: number | undefined;
  let proposedBy: Referral["proposedBy"] | undefined;
  if (action === "accept") status = "ativa";
  else if (action === "reject") status = "rejeitada";
  else {
    status = "contraproposta";
    sharePct = Number(body.sharePct) || undefined;
    proposedBy = body.by === "origem" ? "origem" : "destino";
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const patch: Record<string, unknown> = { status };
      if (sharePct != null) patch.share_pct = sharePct;
      await supabase.from("referrals").update(patch).eq("id", id);
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true, id, status, sharePct, proposedBy });
}
