import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { getDealGate, updateDeal } from "@/lib/db/deals";

/** Edita comprador (nome ou contacto ligado), comissão estimada e partilha
 *  com outra agência de um negócio existente. Nunca mexe na fase (ver
 *  /api/deals/advance). POST { dealId, ...campos a mudar }. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: {
    dealId?: string; buyerName?: string; buyerContactId?: string | null;
    sellerName?: string; amount?: number;
    coBroker?: boolean; coBrokerAgencyId?: string | null;
    coBrokerSplitType?: "percent" | "fixed"; coBrokerSplitPct?: number | null; coBrokerSplitFixed?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dealId = String(body.dealId ?? "").trim();
  if (!dealId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Mesma permissão de avançar fase: staff, equipa do negócio, ou
  // angariador/co-angariador do imóvel.
  const a = session.agent;
  let allowed = isStaff(a) || gate.team.includes(a.id);
  if (!allowed && gate.propertyId) {
    const property = await getPropertyById(gate.propertyId);
    allowed = Boolean(
      property && (property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id))
    );
  }
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const patch: Parameters<typeof updateDeal>[1] = {};
  if ("buyerName" in body) patch.buyerName = body.buyerName;
  if ("buyerContactId" in body) patch.buyerContactId = body.buyerContactId;
  if ("sellerName" in body) patch.sellerName = body.sellerName;
  if ("amount" in body && body.amount != null) patch.amount = Number(body.amount);
  if ("coBroker" in body) {
    patch.coBroker = Boolean(body.coBroker);
    patch.coBrokerAgencyId = body.coBrokerAgencyId ?? null;
  }
  if ("coBrokerSplitType" in body) patch.coBrokerSplitType = body.coBrokerSplitType === "fixed" ? "fixed" : "percent";
  if ("coBrokerSplitPct" in body) patch.coBrokerSplitPct = body.coBrokerSplitPct != null ? Number(body.coBrokerSplitPct) : null;
  if ("coBrokerSplitFixed" in body) patch.coBrokerSplitFixed = body.coBrokerSplitFixed != null ? Number(body.coBrokerSplitFixed) : null;

  const res = await updateDeal(dealId, patch);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
