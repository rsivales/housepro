import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getDealGate } from "@/lib/db/deals";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
import { listDealOffers, registerDealOffer } from "@/lib/db/deal-offers";

/** Histórico de propostas/contrapropostas de um negócio. GET lista; POST
 *  regista a ronda seguinte (proposta ou contraproposta, inferido). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { id: dealId } = await params;
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  const offers = await listDealOffers(dealId);
  return NextResponse.json({ offers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const { id: dealId } = await params;
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  let body: { amount?: number; note?: string; side?: "comprador" | "vendedor" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!(amount > 0))
    return NextResponse.json({ error: "amount_invalid" }, { status: 400 });

  const res = await registerDealOffer(dealId, session.agent.id, {
    amount,
    note: body.note,
    side: body.side,
  });
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  const offers = await listDealOffers(dealId);
  return NextResponse.json({ ...res, offers });
}
