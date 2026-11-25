import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getDealGate } from "@/lib/db/deals";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
import { decideDealOffer, getOfferDealId, listDealOffers } from "@/lib/db/deal-offers";

/** Aceita ou recusa uma proposta/contraproposta pendente. Qualquer um dos
 *  dois agentes do negócio (ou staff) pode decidir.
 *  PATCH { decision: "aceite" | "recusada" } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; offerId: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { id: dealId, offerId } = await params;
  const offerDealId = await getOfferDealId(offerId);
  if (!offerDealId || offerDealId !== dealId)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  let body: { decision?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (body.decision !== "aceite" && body.decision !== "recusada")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const res = await decideDealOffer(offerId, session.agent.id, body.decision);
  if ("error" in res)
    return NextResponse.json(res, {
      status: res.error === "offer_not_pending" ? 409 : 400,
    });
  const offers = await listDealOffers(dealId);
  return NextResponse.json({ ...res, offers });
}
