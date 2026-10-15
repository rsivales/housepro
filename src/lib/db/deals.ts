import {
  estimateDealCommission,
  type DealCommissionEstimate,
  type ProducerContext,
} from "@/lib/commission/deal-estimate";
import { effectiveCommission } from "@/lib/data/commission";
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
  /** Estimativa calculada a partir do valor do negócio + comissão — herdada
   *  do imóvel na criação, nunca pedida de novo ao consultor. */
  commissionEstimate: number | null;
  coBroker: boolean;
  coBrokerAgencyId: string | null;
  /** Fatia da comissão que fica com a outra agência, quando há partilha. */
  coBrokerSplitType: CommissionType;
  coBrokerSplitPct: number | null;
  coBrokerSplitFixed: number | null;
  /** Valor calculado da partilha (a partir de commissionEstimate). */
  coBrokerSplitAmount: number | null;
  updatedAt: string;
  financials?: DealCommissionEstimate;
}

export interface DealDetail extends DealListItem {
  createdAt: string;
  agencyId: string;
  angariadorId: string | null;
  consultorCompradorId: string | null;
  coordenadorId: string | null;
  buyerContact: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  } | null;
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
  co_broker_split_type: string | null;
  co_broker_split_pct: number | null;
  co_broker_split_fixed: number | null;
  updated_at: string | null;
  created_at?: string | null;
  agency_id?: string;
  angariador_id?: string | null;
  consultor_comprador_id?: string | null;
  coordenador_id?: string | null;
  property?:
    | {
        reference?: string;
        title?: string;
        cover_url?: string;
        operation?: "venda" | "arrendamento";
        commission_justification?: string;
        commission_split?: unknown;
      }
    | {
        reference?: string;
        title?: string;
        cover_url?: string;
        operation?: "venda" | "arrendamento";
        commission_justification?: string;
        commission_split?: unknown;
      }[]
    | null;
  buyer_contact?:
    | { id?: string; name?: string; phone?: string; email?: string }
    | { id?: string; name?: string; phone?: string; email?: string }[]
    | null;
  co_broker_agency?: { name?: string } | { name?: string }[] | null;
}

function commissionEstimateOf(
  amount: number,
  type: CommissionType,
  pct: number | null,
  fixed: number | null,
): number | null {
  if (type === "fixed") return fixed != null ? Number(fixed) : null;
  return pct != null
    ? Math.round(amount * (Number(pct) / 100) * 100) / 100
    : null;
}

function mapDeal(r: DealRow): DealListItem {
  const p = (Array.isArray(r.property) ? r.property[0] : r.property) as {
    reference?: string;
    title?: string;
    cover_url?: string;
    operation?: "venda" | "arrendamento";
    commission_justification?: string;
    commission_split?: unknown;
  } | null;
  const amount = r.amount != null ? Number(r.amount) : 0;
  const commissionType: CommissionType =
    r.commission_type === "fixed" ? "fixed" : "percent";
  const commissionPct =
    r.commission_pct != null ? Number(r.commission_pct) : null;
  const commissionFixed =
    r.commission_fixed != null ? Number(r.commission_fixed) : null;
  const gross = (
    commissionType === "fixed" ? commissionFixed == null : commissionPct == null
  )
    ? null
    : Math.round(
        effectiveCommission(amount, {
          operation: p?.operation,
          commissionType,
          commissionPct: commissionPct ?? undefined,
          commissionFixed: commissionFixed ?? undefined,
          commissionJustification: p?.commission_justification,
        }).amount * 100,
      ) / 100;
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
    commissionEstimate: gross,
    coBroker: Boolean(r.co_broker),
    coBrokerAgencyId: r.co_broker_agency_id
      ? String(r.co_broker_agency_id)
      : null,
    coBrokerSplitType: r.co_broker_split_type === "fixed" ? "fixed" : "percent",
    coBrokerSplitPct:
      r.co_broker_split_pct != null ? Number(r.co_broker_split_pct) : null,
    coBrokerSplitFixed:
      r.co_broker_split_fixed != null ? Number(r.co_broker_split_fixed) : null,
    coBrokerSplitAmount: Boolean(r.co_broker)
      ? commissionEstimateOf(
          gross ?? 0,
          r.co_broker_split_type === "fixed" ? "fixed" : "percent",
          r.co_broker_split_pct != null ? Number(r.co_broker_split_pct) : null,
          r.co_broker_split_fixed != null
            ? Number(r.co_broker_split_fixed)
            : null,
        )
      : null,
    updatedAt: String(r.updated_at ?? ""),
  };
}

function mapDealDetail(r: DealRow): DealDetail {
  const base = mapDeal(r);
  const bc = (
    Array.isArray(r.buyer_contact) ? r.buyer_contact[0] : r.buyer_contact
  ) as { id?: string; name?: string; phone?: string; email?: string } | null;
  const cba = (
    Array.isArray(r.co_broker_agency)
      ? r.co_broker_agency[0]
      : r.co_broker_agency
  ) as { name?: string } | null;
  return {
    ...base,
    createdAt: String(r.created_at ?? ""),
    agencyId: String(r.agency_id ?? ""),
    angariadorId: r.angariador_id ? String(r.angariador_id) : null,
    consultorCompradorId: r.consultor_comprador_id
      ? String(r.consultor_comprador_id)
      : null,
    coordenadorId: r.coordenador_id ? String(r.coordenador_id) : null,
    buyerContact: bc?.id
      ? {
          id: String(bc.id),
          name: bc.name ?? "",
          phone: bc.phone,
          email: bc.email,
        }
      : null,
    coBrokerAgencyName: cba?.name ?? null,
  };
}

const DEAL_COLS =
  "id, property_id, buyer_name, buyer_contact_id, seller_name, amount, stage, commission_type, commission_pct, commission_fixed, co_broker, co_broker_agency_id, co_broker_split_type, co_broker_split_pct, co_broker_split_fixed, updated_at, agency_id, angariador_id, consultor_comprador_id, coordenador_id";

const SELECT = `${DEAL_COLS}, property:properties!property_id(reference, title, cover_url, operation, commission_justification, commission_split)`;

const SELECT_DETAIL =
  `${DEAL_COLS}, created_at, ` +
  "property:properties!property_id(reference, title, cover_url, operation, commission_justification, commission_split), buyer_contact:contacts!buyer_contact_id(id, name, phone, email), co_broker_agency:agencies!co_broker_agency_id(name)";

/** Negócios visíveis ao consultor: aqueles em que participa; staff vê todos. */
export async function listDeals(
  agentId: string,
  staff: boolean,
  scope?: { agencyId: string; global: boolean },
): Promise<DealListItem[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  let query = sb
    .from("deals")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (!staff) {
    query = query.or(
      `angariador_id.eq.${agentId},consultor_comprador_id.eq.${agentId},coordenador_id.eq.${agentId}`,
    );
  }
  if (staff && scope && !scope.global)
    query = query.eq("agency_id", scope.agencyId);
  const { data, error } = await query;
  if (error || !data) return [];
  return enrichFinancials(data as DealRow[], sb);
}

/** Ids de equipa do negócio (para verificação de permissão). */
export async function getDealGate(
  dealId: string,
): Promise<{
  propertyId: string | null;
  agencyId: string;
  team: string[];
} | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("deals")
    .select(
      "property_id, agency_id, angariador_id, consultor_comprador_id, coordenador_id",
    )
    .eq("id", dealId)
    .maybeSingle();
  if (!data) return null;
  const team = [
    data.angariador_id,
    data.consultor_comprador_id,
    data.coordenador_id,
  ]
    .filter(Boolean)
    .map(String);
  return {
    propertyId: data.property_id ? String(data.property_id) : null,
    agencyId: String(data.agency_id ?? ""),
    team,
  };
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
  coBrokerSplitType?: CommissionType;
  coBrokerSplitPct?: number;
  coBrokerSplitFixed?: number;
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
      commission_fixed:
        input.commissionFixed != null ? input.commissionFixed : null,
      co_broker: Boolean(input.coBroker),
      co_broker_agency_id: input.coBroker
        ? input.coBrokerAgencyId || null
        : null,
      co_broker_split_type: input.coBrokerSplitType ?? "percent",
      co_broker_split_pct:
        input.coBrokerSplitPct != null ? input.coBrokerSplitPct : null,
      co_broker_split_fixed:
        input.coBrokerSplitFixed != null ? input.coBrokerSplitFixed : null,
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
  staff: boolean,
  scope?: { agencyId: string; global: boolean },
): Promise<DealDetail | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deals")
    .select(SELECT_DETAIL)
    .eq("id", dealId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as DealRow;
  const team = [
    row.angariador_id,
    row.consultor_comprador_id,
    row.coordenador_id,
  ]
    .filter(Boolean)
    .map(String);
  if (!staff && !team.includes(agentId)) return null;
  if (staff && scope && !scope.global && row.agency_id !== scope.agencyId)
    return null;
  const [enriched] = await enrichFinancials([row], sb);
  return { ...mapDealDetail(row), financials: enriched.financials };
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
    coBroker?: boolean;
    coBrokerAgencyId?: string | null;
    coBrokerSplitType?: CommissionType;
    coBrokerSplitPct?: number | null;
    coBrokerSplitFixed?: number | null;
  },
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if ("buyerName" in patch) dbPatch.buyer_name = patch.buyerName || null;
  if ("buyerContactId" in patch)
    dbPatch.buyer_contact_id = patch.buyerContactId || null;
  if ("sellerName" in patch) dbPatch.seller_name = patch.sellerName || null;
  if ("amount" in patch)
    dbPatch.amount = patch.amount != null ? patch.amount : null;
  if ("coBroker" in patch) {
    dbPatch.co_broker = Boolean(patch.coBroker);
    dbPatch.co_broker_agency_id = patch.coBroker
      ? patch.coBrokerAgencyId || null
      : null;
  }
  if ("coBrokerSplitType" in patch)
    dbPatch.co_broker_split_type = patch.coBrokerSplitType ?? "percent";
  if ("coBrokerSplitPct" in patch)
    dbPatch.co_broker_split_pct = patch.coBrokerSplitPct;
  if ("coBrokerSplitFixed" in patch)
    dbPatch.co_broker_split_fixed = patch.coBrokerSplitFixed;
  const { error } = await sb.from("deals").update(dbPatch).eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Avança/recua a fase de um negócio, regista o evento e sincroniza o estado do
 *  imóvel (reserva→reservado, cpcv→cpcv, escritura/concluído→vendido). */
export async function advanceDeal(
  dealId: string,
  toStage: DealStage,
  actorId: string,
  expectedStage?: DealStage,
): Promise<
  | { ok: true; propertyStatus: string | null; warning?: string }
  | { error: string }
> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data: deal } = await sb
    .from("deals")
    .select("id, property_id, stage, updated_at")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "not_found" };

  if (expectedStage && expectedStage !== deal.stage)
    return { error: "stage_conflict" };
  if (deal.stage === toStage) return { ok: true, propertyStatus: null };
  const changedAt = new Date().toISOString();
  let write = sb
    .from("deals")
    .update({ stage: toStage, updated_at: changedAt })
    .eq("id", dealId)
    .eq("stage", deal.stage);
  if (deal.updated_at) write = write.eq("updated_at", deal.updated_at);
  const { data: saved, error: writeError } = await write
    .select("id")
    .maybeSingle();
  if (writeError) return { error: writeError.message };
  if (!saved) return { error: "stage_conflict" };
  const { error: eventError } = await sb
    .from("deal_events")
    .insert({
      deal_id: dealId,
      track: "transacional",
      from_stage: String(deal.stage ?? ""),
      to_stage: toStage,
      actor_id: actorId,
    });
  let warning: string | undefined;
  if (eventError) {
    // Compensate only if no one has changed this saved revision in the meantime.
    const { data: restored, error: restoreError } = await sb
      .from("deals")
      .update({ stage: deal.stage, updated_at: deal.updated_at })
      .eq("id", dealId)
      .eq("stage", toStage)
      .eq("updated_at", changedAt)
      .select("id")
      .maybeSingle();
    if (restored && !restoreError) return { error: "history_save_failed" };
    warning =
      "A fase foi guardada, mas não foi possível registar o histórico. Atualize o negócio para confirmar o estado.";
  }

  let propertyStatus: string | null = null;
  if (deal.property_id) {
    const applied = await syncPropertyStatusFromDeal(
      String(deal.property_id),
      toStage,
    );
    if (
      !applied &&
      ["reserva", "cpcv", "escritura", "concluido"].includes(toStage)
    )
      warning =
        "A fase foi guardada, mas o estado do imóvel não foi sincronizado. Tente novamente no detalhe do negócio.";
    if (applied) {
      const { dealStageToStatus } = await import("@/lib/data/deal");
      propertyStatus = dealStageToStatus(toStage);
    }
  }
  return { ok: true, propertyStatus, ...(warning ? { warning } : {}) };
}

/** Apaga um negócio (e o seu histórico de fases, em cascata). Só para engano
 *  de criação ou limpeza — staff apenas, gate de permissão na rota. */
export async function deleteDeal(
  dealId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { error } = await sb.from("deals").delete().eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Batch the producer inputs; a missing profile never becomes an invented 0%/0 EUR plan. */
async function enrichFinancials(
  rows: DealRow[],
  sb: ReturnType<typeof createAdminClient>,
): Promise<DealListItem[]> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.angariador_id) ids.add(row.angariador_id);
    if (row.consultor_comprador_id) ids.add(row.consultor_comprador_id);
    const p = Array.isArray(row.property) ? row.property[0] : row.property;
    if (Array.isArray(p?.commission_split))
      for (const allocation of p.commission_split) {
        const id = allocation?.agent_id ?? allocation?.agentId;
        if (id) ids.add(String(id));
      }
  }
  const profiles = new Map<string, ProducerContext>();
  if (ids.size) {
    const { data, error } = await sb
      .from("profiles")
      .select("id,name,monthly_gross,company_validated")
      .in("id", [...ids]);
    if (!error)
      for (const p of data ?? [])
        profiles.set(p.id, {
          id: p.id,
          name: p.name,
          monthlyGross: Number(p.monthly_gross),
          companyValidated: p.company_validated === true,
        });
  }
  return rows.map((row) => {
    const deal = mapDeal(row),
      p = Array.isArray(row.property) ? row.property[0] : row.property;
    return {
      ...deal,
      financials: estimateDealCommission(
        {
          gross: deal.commissionEstimate,
          externalShare: deal.coBrokerSplitAmount,
          coBroker: deal.coBroker,
          producerId: row.angariador_id ?? null,
          buyerAgentId: row.consultor_comprador_id ?? null,
          allocations: p?.commission_split,
        },
        profiles,
      ),
    };
  });
}
