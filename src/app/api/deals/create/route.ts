import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById, claimContactIfUnowned } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { createDeal } from "@/lib/db/deals";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** Cria um negócio (processo) ligado a um imóvel. POST { propertyId, buyerName,
 *  sellerName, amount } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: {
    propertyId?: string; reference?: string; buyerName?: string; buyerContactId?: string;
    sellerName?: string; amount?: number; coBroker?: boolean; coBrokerAgencyId?: string;
    coBrokerSplitType?: "percent" | "fixed"; coBrokerSplitPct?: number; coBrokerSplitFixed?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  let propertyId = String(body.propertyId ?? "").trim();
  // Sem id? resolve pela referência (ex.: HP-1049).
  if (!propertyId && body.reference && hasServiceRole()) {
    const sb = createAdminClient();
    const { data } = await sb
      .from("properties")
      .select("id")
      .eq("reference", String(body.reference).trim())
      .maybeSingle();
    if (data?.id) propertyId = String(data.id);
  }
  if (!propertyId) return NextResponse.json({ error: "property_missing" }, { status: 400 });

  const property = await getPropertyById(propertyId);
  if (!property) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const a = session.agent;
  const isListingTeam = property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id);
  // Imóvel de outro consultor (da mesma agência ou de outra): continua a poder
  // criar o negócio, mas entra como consultor comprador — não como angariador
  // — e o negócio fica assinalado como partilhado quando a agência difere.
  const allowed = isListingTeam || isStaff(a) || Boolean(property.agentId);
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const agencyId = property.agent?.agencyId || a.agencyId;
  if (!agencyId) return NextResponse.json({ error: "agency_unknown" }, { status: 400 });

  const otherAgency = !isListingTeam && property.agent?.agencyId && a.agencyId && property.agent.agencyId !== a.agencyId;

  const res = await createDeal({
    propertyId,
    agencyId,
    angariadorId: property.agentId,
    consultorCompradorId: isListingTeam ? undefined : a.id,
    buyerName: body.buyerName ? String(body.buyerName) : undefined,
    buyerContactId: body.buyerContactId ? String(body.buyerContactId) : undefined,
    sellerName: body.sellerName ? String(body.sellerName) : undefined,
    amount: body.amount != null ? Number(body.amount) : undefined,
    // Comissão herdada do imóvel — nunca pedida de novo ao consultor.
    commissionType: property.commissionType ?? "percent",
    commissionPct: property.commissionPct,
    commissionFixed: property.commissionFixed,
    // Imóvel de outra agência trazido por este consultor: partilha automática
    // com a SUA agência (não a do dropdown, que lista as "outras" agências do
    // ponto de vista de quem lista o imóvel).
    coBroker: otherAgency ? true : Boolean(body.coBroker),
    coBrokerAgencyId: otherAgency ? a.agencyId : (body.coBrokerAgencyId ? String(body.coBrokerAgencyId) : undefined),
    coBrokerSplitType: body.coBrokerSplitType === "fixed" ? "fixed" : "percent",
    coBrokerSplitPct: body.coBrokerSplitPct != null ? Number(body.coBrokerSplitPct) : undefined,
    coBrokerSplitFixed: body.coBrokerSplitFixed != null ? Number(body.coBrokerSplitFixed) : undefined,
  });
  if ("error" in res) {
    console.error("[deals/create]", res.error);
    return NextResponse.json(res, { status: 400 });
  }
  // Comprador autorregistado (/cliente/entrar) sem consultor ainda — ao
  // ligá-lo a este negócio, passa a ser da carteira de quem o criou.
  if (body.buyerContactId) await claimContactIfUnowned(String(body.buyerContactId), a.id);
  return NextResponse.json({ ok: true, id: res.id });
}
