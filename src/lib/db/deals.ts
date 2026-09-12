import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { syncPropertyStatusFromDeal } from "@/lib/db/property-status";
import type { DealStage } from "@/lib/data/deal";

export interface DealListItem {
  id: string;
  propertyId: string | null;
  propertyRef: string;
  propertyTitle: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  stage: DealStage;
  updatedAt: string;
}

interface DealRow {
  id: string;
  property_id: string | null;
  buyer_name: string | null;
  seller_name: string | null;
  amount: number | null;
  stage: string;
  updated_at: string | null;
  property?: { reference?: string; title?: string } | { reference?: string; title?: string }[] | null;
}

function mapDeal(r: DealRow): DealListItem {
  const p = (Array.isArray(r.property) ? r.property[0] : r.property) as { reference?: string; title?: string } | null;
  return {
    id: String(r.id),
    propertyId: r.property_id ? String(r.property_id) : null,
    propertyRef: p?.reference ?? "—",
    propertyTitle: p?.title ?? "",
    buyerName: r.buyer_name ?? "",
    sellerName: r.seller_name ?? "",
    amount: r.amount != null ? Number(r.amount) : 0,
    stage: (r.stage as DealStage) ?? "proposta_enviada",
    updatedAt: String(r.updated_at ?? ""),
  };
}

const SELECT = "id, property_id, buyer_name, seller_name, amount, stage, updated_at, property:properties!property_id(reference, title)";

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
  sellerName?: string;
  amount?: number;
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
      seller_name: input.sellerName || null,
      amount: input.amount != null ? input.amount : null,
      stage: "proposta_enviada",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "insert_failed" };
  return { id: String(data.id) };
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
