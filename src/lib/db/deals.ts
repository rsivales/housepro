import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { syncPropertyStatusFromDeal } from "@/lib/db/property-status";
import type { DealStage } from "@/lib/data/deal";

export type CommissionType = "percent" | "fixed";

export interface DealListItem {
  id: string;
  propertyId: string | null;
  propertyRef: string;
  propertyTitle: string;
  /** Miniatura da foto de capa do imóvel — para identificar o cartão de relance. */
  propertyImage: string | null;
  buyerName: string;
  /** Contacto comprador ligado (ficha central de pessoa) — null se só texto livre. */
  buyerContactId: string | null;
  sellerName: string;
  amount: number;
  stage: DealStage;
  commissionType: CommissionType;
  commissionPct: number | null;
  commissionFixed: number | null;
  /** Estimativa calculada a partir do valor do negócio + comissão. */
  commissionEstimate: number | null;
  coBroker: boolean;
  coBrokerAgencyId: string | null;
  updatedAt: string;
}

export interface DealDetail extends DealListItem {
  createdAt: string;
  agencyId: string;
  angariadorId: string | null;
  consultorCompradorId: string | null;
  coordenadorId: string | null;
  buyerContact: { id: string; name: string; phone?: string; email?: string } | null;
  coBrokerAgencyName: string | null;
}

interface DealRow {
  id: string;
  property_id: string | null;
  buyer_name: string | null;
  buyer_contact_id: string | null;
  seller_name: string | null;
  amount: number | null;
  stage: string;
  commission_type: string | null;
  commission_pct: number | null;
  commission_fixed: number | null;
  co_broker: boolean | null;
  co_broker_agency_id: string | null;
  updated_at: string | null;
  created_at?: string | null;
  agency_id?: string;
  angariador_id?: string | null;
  consultor_comprador_id?: string | null;
  coordenador_id?: string | null;
  property?:
    | { reference?: string; title?: string; cover_url?: string }
    | { reference?: string; title?: string; cover_url?: string }[]
    | null;
  buyer_contact?:
    | { id?: string; name?: string; phone?: string; email?: string }
    | { id?: string; name?: string; phone?: string; email?: string }[]
    | null;
  co_broker_agency?:
    | { name?: string }
    | { name?: string }[]
    | null;
}

function commissionEstimateOf(
  amount: number,
  type: CommissionType,
  pct: number | null,
  fixed: number | null
): number | null {
  if (type === "fixed") return fixed != null ? Number(fixed) : null;
  return pct != null ? Math.round(amount * (Number(pct) / 100) * 100) / 100 : null;
}

function mapDeal(r: DealRow): DealListItem {
  const p = (Array.isArray(r.property) ? r.property[0] : r.property) as
    | { reference?: string; title?: string; cover_url?: string }
    | null;
  const amount = r.amount != null ? Number(r.amount) : 0;
  const commissionType: CommissionType = r.commission_type === "fixed" ? "fixed" : "percent";
  const commissionPct = r.commission_pct != null ? Number(r.commission_pct) : null;
  const commissionFixed = r.commission_fixed != null ? Number(r.commission_fixed) : null;
  return {
    id: String(r.id),
    propertyId: r.property_id ? String(r.property_id) : null,
    propertyRef: p?.reference ?? "—",
    propertyTitle: p?.title ?? "",
    propertyImage: p?.cover_url || null,
    buyerName: r.buyer_name ?? "",
    buyerContactId: r.buyer_contact_id ? String(r.buyer_contact_id) : null,
    sellerName: r.seller_name ?? "",
    amount,
    stage: (r.stage as DealStage) ?? "proposta_enviada",
    commissionType,
    commissionPct,
    commissionFixed,
    commissionEstimate: commissionEstimateOf(amount, commissionType, commissionPct, commissionFixed),
    coBroker: Boolean(r.co_broker),
    coBrokerAgencyId: r.co_broker_agency_id ? String(r.co_broker_agency_id) : null,
    updatedAt: String(r.updated_at ?? ""),
  };
}

function mapDealDetail(r: DealRow): DealDetail {
  const base = mapDeal(r);
  const bc = (Array.isArray(r.buyer_contact) ? r.buyer_contact[0] : r.buyer_contact) as
    | { id?: string; name?: string; phone?: string; email?: string }
    | null;
  const cba = (Array.isArray(r.co_broker_agency) ? r.co_broker_agency[0] : r.co_broker_agency) as
    | { name?: string }
    | null;
  return {
    ...base,
    createdAt: String(r.created_at ?? ""),
    agencyId: String(r.agency_id ?? ""),
    angariadorId: r.angariador_id ? String(r.angariador_id) : null,
    consultorCompradorId: r.consultor_comprador_id ? String(r.consultor_comprador_id) : null,
    coordenadorId: r.coordenador_id ? String(r.coordenador_id) : null,
    buyerContact: bc?.id ? { id: String(bc.id), name: bc.name ?? "", phone: bc.phone, email: bc.email } : null,
    coBrokerAgencyName: cba?.name ?? null,
  };
}

const SELECT =
  "id, property_id, buyer_name, buyer_contact_id, seller_name, amount, stage, commission_type, commission_pct, commission_fixed, co_broker, co_broker_agency_id, updated_at, property:properties!property_id(reference, title, cover_url)";

const SELECT_DETAIL =
  "id, property_id, buyer_name, buyer_contact_id, seller_name, amount, stage, commission_type, commission_pct, commission_fixed, co_broker, co_broker_agency_id, updated_at, created_at, agency_id, angariador_id, consultor_comprador_id, coordenador_id, " +
  "property:properties!property_id(reference, title, cover_url), buyer_contact:contacts!buyer_contact_id(id, name, phone, email), co_broker_agency:agencies!co_broker_agency_id(name)";

/** Negócios visíveis ao consultor: aqueles em que participa; staff vê todos. */
export async function listDeals(agentId: string, staff: boolean): Promise<DealListItem[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  let query = sb.from("deals").select(SELECT).order("updated_at", { ascending: false });
  if (!staff) {
    query = query.or(
      `angariador_id.eq.${agentId},consultor_comprador_id.eq.${agentId},coordenador_id.eq.${agentId}`
    );
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as DealRow[]).map(mapDeal);
}

/** Ids de equipa do negócio (para verificação de permissão). */
export async function getDealGate(
  dealId: string
): Promise<{ propertyId: string | null; team: string[] } | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("deals")
    .select("property_id, angariador_id, consultor_comprador_id, coordenador_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!data) return null;
  const team = [data.angariador_id, data.consultor_comprador_id, data.coordenador_id]
    .filter(Boolean)
    .map(String);
  return { propertyId: data.property_id ? String(data.property_id) : null, team };
}

/** Cria um negócio ligado a um imóvel. agency_id vem da agência do angariador. */
export async function createDeal(input: {
  propertyId: string;
  agencyId: string;
  angariadorId: string;
  buyerName?: string;
  buyerContactId?: string;
  sellerName?: string;
  amount?: number;
  commissionType?: CommissionType;
  commissionPct?: number;
  commissionFixed?: number;
  coBroker?: boolean;
  coBrokerAgencyId?: string;
}): Promise<{ id: string } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deals")
    .insert({
      property_id: input.propertyId,
      agency_id: input.agencyId,
      angariador_id: input.angariadorId,
      buyer_name: input.buyerName || null,
      buyer_contact_id: input.buyerContactId || null,
      seller_name: input.sellerName || null,
      amount: input.amount != null ? input.amount : null,
      commission_type: input.commissionType ?? "percent",
      commission_pct: input.commissionPct != null ? input.commissionPct : null,
      commission_fixed: input.commissionFixed != null ? input.commissionFixed : null,
      co_broker: Boolean(input.coBroker),
      co_broker_agency_id: input.coBroker ? (input.coBrokerAgencyId || null) : null,
      stage: "proposta_enviada",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "insert_failed" };
  return { id: String(data.id) };
}

/** Um negócio completo (para a página de detalhe) — só devolve quando o
 *  pedinte tem permissão (staff ou equipa do negócio). */
export async function getDeal(
  dealId: string,
  agentId: string,
  staff: boolean
): Promise<DealDetail | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data, error } = await sb.from("deals").select(SELECT_DETAIL).eq("id", dealId).maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as DealRow;
  const team = [row.angariador_id, row.consultor_comprador_id, row.coordenador_id].filter(Boolean).map(String);
  if (!staff && !team.includes(agentId)) return null;
  return mapDealDetail(row);
}

/** Edita comprador (texto ou contacto ligado), comissão e partilha com outra
 *  agência de um negócio existente. Nunca mexe na fase (ver advanceDeal). */
export async function updateDeal(
  dealId: string,
  patch: {
    buyerName?: string;
    buyerContactId?: string | null;
    sellerName?: string;
    amount?: number;
    commissionType?: CommissionType;
    commissionPct?: number | null;
    commissionFixed?: number | null;
    coBroker?: boolean;
    coBrokerAgencyId?: string | null;
  }
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("buyerName" in patch) dbPatch.buyer_name = patch.buyerName || null;
  if ("buyerContactId" in patch) dbPatch.buyer_contact_id = patch.buyerContactId || null;
  if ("sellerName" in patch) dbPatch.seller_name = patch.sellerName || null;
  if ("amount" in patch) dbPatch.amount = patch.amount != null ? patch.amount : null;
  if ("commissionType" in patch) dbPatch.commission_type = patch.commissionType ?? "percent";
  if ("commissionPct" in patch) dbPatch.commission_pct = patch.commissionPct;
  if ("commissionFixed" in patch) dbPatch.commission_fixed = patch.commissionFixed;
  if ("coBroker" in patch) {
    dbPatch.co_broker = Boolean(patch.coBroker);
    dbPatch.co_broker_agency_id = patch.coBroker ? (patch.coBrokerAgencyId || null) : null;
  }
  const { error } = await sb.from("deals").update(dbPatch).eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Avança/recua a fase de um negócio, regista o evento e sincroniza o estado do
 *  imóvel (reserva→reservado, cpcv→cpcv, escritura/concluído→vendido). */
export async function advanceDeal(
  dealId: string,
  toStage: DealStage,
  actorId: string
): Promise<{ ok: true; propertyStatus: string | null } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data: deal } = await sb
    .from("deals")
    .select("id, property_id, stage")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "not_found" };

  await sb.from("deals").update({ stage: toStage, updated_at: new Date().toISOString() }).eq("id", dealId);
  await sb.from("deal_events").insert({
    deal_id: dealId,
    track: "transacional",
    from_stage: String(deal.stage ?? ""),
    to_stage: toStage,
    actor_id: actorId,
  });

  let propertyStatus: string | null = null;
  if (deal.property_id) {
    const applied = await syncPropertyStatusFromDeal(String(deal.property_id), toStage);
    if (applied) {
      const { dealStageToStatus } = await import("@/lib/data/deal");
      propertyStatus = dealStageToStatus(toStage);
    }
  }
  return { ok: true, propertyStatus };
}
