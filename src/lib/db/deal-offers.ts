import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { advanceDeal } from "@/lib/db/deals";
import type { DealStage } from "@/lib/data/deal";

export type OfferKind = "proposta" | "contraproposta";
export type OfferSide = "comprador" | "vendedor";
export type OfferStatus = "pendente" | "aceite" | "recusada" | "substituida";

export interface DealOffer {
  id: string;
  dealId: string;
  kind: OfferKind;
  side: OfferSide;
  amount: number;
  status: OfferStatus;
  note: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
}

interface OfferRow {
  id: string;
  deal_id: string;
  kind: string;
  side: string;
  amount: number;
  status: string;
  note: string | null;
  created_by: string;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  creator?: { name?: string } | { name?: string }[] | null;
}

const OFFER_COLS =
  "id, deal_id, kind, side, amount, status, note, created_by, created_at, decided_by, decided_at, creator:profiles!created_by(name)";

function mapOffer(r: OfferRow): DealOffer {
  const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator;
  return {
    id: String(r.id),
    dealId: String(r.deal_id),
    kind: r.kind as OfferKind,
    side: r.side as OfferSide,
    amount: Number(r.amount),
    status: r.status as OfferStatus,
    note: r.note,
    createdBy: String(r.created_by),
    createdByName: creator?.name ?? "—",
    createdAt: String(r.created_at),
    decidedBy: r.decided_by ? String(r.decided_by) : null,
    decidedAt: r.decided_at,
  };
}

/** Referência curta de apresentação — determinística a partir do id do
 *  negócio, sem precisar de sequência própria (mesmo padrão de qualificationRef). */
export function dealOfferRef(dealId: string) {
  return `PR-${dealId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Histórico de propostas/contrapropostas de um negócio, mais antiga primeiro. */
export async function listDealOffers(dealId: string): Promise<DealOffer[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deal_offers")
    .select(OFFER_COLS)
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as OfferRow[]).map(mapOffer);
}

/** A proposta/contraproposta mais recente de cada negócio — para a lista
 *  agregada de triagem (/app/propostas). */
export async function listLatestOffersForDeals(
  dealIds: string[],
): Promise<Map<string, DealOffer>> {
  const out = new Map<string, DealOffer>();
  if (!hasServiceRole() || dealIds.length === 0) return out;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deal_offers")
    .select(OFFER_COLS)
    .in("deal_id", dealIds)
    .order("created_at", { ascending: false });
  if (error || !data) return out;
  for (const row of data as unknown as OfferRow[]) {
    const offer = mapOffer(row);
    if (!out.has(offer.dealId)) out.set(offer.dealId, offer);
  }
  return out;
}

export interface PropostaBoardRow {
  dealId: string;
  reference: string;
  propertyRef: string;
  propertyTitle: string;
  buyerName: string;
  sellerName: string;
  stage: string;
  coBroker: boolean;
  angariadorName: string;
  angariadorAgency: string;
  consultorName: string;
  consultorAgency: string;
  currentAmount: number;
  updatedAt: string;
  latestOffer: DealOffer | null;
}

/** Lista agregada para a triagem em /app/propostas — um negócio por linha,
 *  com a ronda mais recente (se existir) e os dois agentes identificados. */
export async function listPropostasBoard(
  agentId: string,
  staff: boolean,
  scope?: { agencyId: string; global: boolean },
): Promise<PropostaBoardRow[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  let query = sb
    .from("deals")
    .select(
      "id, stage, amount, buyer_name, seller_name, co_broker, updated_at, " +
        "property:properties!property_id(reference, title), " +
        "angariador:profiles!angariador_id(name, agency:agencies!agency_id(name)), " +
        "consultor:profiles!consultor_comprador_id(name, agency:agencies!agency_id(name))",
    )
    .order("updated_at", { ascending: false });
  if (!staff) {
    query = query.or(
      `angariador_id.eq.${agentId},consultor_comprador_id.eq.${agentId},coordenador_id.eq.${agentId}`,
    );
  }
  if (staff && scope && !scope.global) query = query.eq("agency_id", scope.agencyId);
  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as unknown as {
    id: string;
    stage: string;
    amount: number | null;
    buyer_name: string | null;
    seller_name: string | null;
    co_broker: boolean | null;
    updated_at: string;
    property?: { reference?: string; title?: string } | { reference?: string; title?: string }[] | null;
    angariador?: { name?: string; agency?: { name?: string } | { name?: string }[] } | { name?: string; agency?: { name?: string } | { name?: string }[] }[] | null;
    consultor?: { name?: string; agency?: { name?: string } | { name?: string }[] } | { name?: string; agency?: { name?: string } | { name?: string }[] }[] | null;
  }[];
  const latest = await listLatestOffersForDeals(rows.map((r) => r.id));

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    (Array.isArray(v) ? v[0] : v) ?? null;

  return rows.map((r) => {
    const property = one(r.property);
    const angariador = one(r.angariador);
    const consultor = one(r.consultor);
    const offer = latest.get(r.id) ?? null;
    return {
      dealId: r.id,
      reference: dealOfferRef(r.id),
      propertyRef: property?.reference ?? "—",
      propertyTitle: property?.title ?? "",
      buyerName: r.buyer_name ?? "",
      sellerName: r.seller_name ?? "",
      stage: r.stage,
      coBroker: Boolean(r.co_broker),
      angariadorName: angariador?.name ?? "—",
      angariadorAgency: one(angariador?.agency)?.name ?? "—",
      consultorName: consultor?.name ?? "—",
      consultorAgency: one(consultor?.agency)?.name ?? "—",
      currentAmount: offer?.amount ?? (r.amount != null ? Number(r.amount) : 0),
      updatedAt: r.updated_at,
      latestOffer: offer,
    };
  });
}

/** Regista uma proposta (primeira ronda) ou contraproposta (rondas seguintes)
 *  — o tipo e o lado inferem-se automaticamente a partir de quem regista e
 *  do histórico existente. Qualquer ronda pendente anterior passa a
 *  "substituida": há sempre, no máximo, uma ronda em aberto por negócio. */
export async function registerDealOffer(
  dealId: string,
  createdBy: string,
  input: { amount: number; note?: string; side?: OfferSide },
): Promise<{ id: string } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  if (!(input.amount > 0)) return { error: "amount_invalid" };
  const sb = createAdminClient();
  const { data: deal } = await sb
    .from("deals")
    .select("id, angariador_id, consultor_comprador_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "not_found" };

  let side = input.side;
  if (!side) {
    if (createdBy === deal.consultor_comprador_id) side = "comprador";
    else if (createdBy === deal.angariador_id) side = "vendedor";
    else return { error: "side_required" };
  }

  const { count } = await sb
    .from("deal_offers")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", dealId);
  const kind: OfferKind = count && count > 0 ? "contraproposta" : "proposta";

  // Substitui a ronda pendente anterior (se existir) antes de abrir a nova —
  // o índice único garante que nunca ficam duas pendentes ao mesmo tempo.
  await sb
    .from("deal_offers")
    .update({ status: "substituida", decided_by: createdBy, decided_at: new Date().toISOString() })
    .eq("deal_id", dealId)
    .eq("status", "pendente");

  const { data: saved, error } = await sb
    .from("deal_offers")
    .insert({
      deal_id: dealId,
      kind,
      side,
      amount: input.amount,
      note: input.note?.trim() || null,
      created_by: createdBy,
      status: "pendente",
    })
    .select("id")
    .single();
  if (error || !saved) return { error: error?.message ?? "insert_failed" };
  return { id: String(saved.id) };
}

/** Negócio a que pertence uma proposta — para o gate de permissão na rota. */
export async function getOfferDealId(offerId: string): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("deal_offers")
    .select("deal_id")
    .eq("id", offerId)
    .maybeSingle();
  return data?.deal_id ? String(data.deal_id) : null;
}

/** Aceita ou recusa a ronda pendente — qualquer um dos dois agentes do
 *  negócio pode decidir (ver dealTeamOrStaffAllowed na rota). Aceitar
 *  atualiza o valor do negócio e avança a fase para "proposta_aceite". */
export async function decideDealOffer(
  offerId: string,
  decidedBy: string,
  decision: "aceite" | "recusada",
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data: offer } = await sb
    .from("deal_offers")
    .select("id, deal_id, amount, status")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { error: "not_found" };
  if (offer.status !== "pendente") return { error: "offer_not_pending" };

  const { data: updated, error } = await sb
    .from("deal_offers")
    .update({ status: decision, decided_by: decidedBy, decided_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "offer_not_pending" };

  if (decision === "aceite") {
    await sb
      .from("deals")
      .update({ amount: offer.amount, updated_at: new Date().toISOString() })
      .eq("id", offer.deal_id);
    const { data: deal } = await sb
      .from("deals")
      .select("stage")
      .eq("id", offer.deal_id)
      .maybeSingle();
    if (deal?.stage === "proposta_enviada")
      await advanceDeal(offer.deal_id, "proposta_aceite" as DealStage, decidedBy, "proposta_enviada" as DealStage);
  }
  return { ok: true };
}
