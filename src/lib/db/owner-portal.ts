import { randomBytes } from "crypto";

import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { DEAL_STEPS, type DealStage } from "@/lib/data/deal";
import type { PropertyStatus } from "@/lib/data/types";

/** Garante um token de portal do proprietário para o imóvel e devolve-o. */
export async function ensureOwnerToken(propertyId: string): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("properties").select("owner_token").eq("id", propertyId).maybeSingle();
  if (data?.owner_token) return String(data.owner_token);
  const token = randomBytes(24).toString("base64url");
  const { error } = await sb.from("properties").update({ owner_token: token }).eq("id", propertyId);
  if (error) return null;
  return token;
}

export interface OwnerPortal {
  ref: string;
  title: string;
  municipality: string;
  status: PropertyStatus | null;
  offMarket: boolean;
  interest: number;
  visitsScheduled: number;
  visitsDone: number;
  leadsCount: number;
  dealStage: DealStage | null;
  milestones: { stage: DealStage; label: string; reached: boolean; at?: string }[];
}

/** Dados (só leitura) do portal do proprietário a partir do token. */
export async function getOwnerPortalData(token: string): Promise<OwnerPortal | null> {
  if (!hasServiceRole() || !token) return null;
  const sb = createAdminClient();
  const { data: p } = await sb
    .from("properties")
    .select("id, reference, title, municipality, status, off_market, interest")
    .eq("owner_token", token)
    .maybeSingle();
  if (!p) return null;
  const id = String(p.id);
  const ref = String(p.reference ?? "");

  // Visitas (agendadas/realizadas) — por id ou referência.
  const { data: visitRows } = await sb
    .from("visits")
    .select("status")
    .or(`property_id.eq.${id},property_ref.eq.${ref}`);
  const visits = (visitRows ?? []) as { status?: string }[];
  const visitsDone = visits.filter((v) => v.status === "feita").length;
  const visitsScheduled = visits.filter((v) => v.status === "agendada").length;

  // Interessados (leads) do imóvel.
  const { count: leadsCount } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);

  // Negócio mais recente + eventos (marcos da transação).
  const { data: deal } = await sb
    .from("deals")
    .select("id, stage")
    .eq("property_id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reachedAt = new Map<string, string>();
  if (deal?.id) {
    const { data: events } = await sb
      .from("deal_events")
      .select("to_stage, created_at")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });
    for (const e of (events ?? []) as { to_stage?: string; created_at?: string }[]) {
      if (e.to_stage && !reachedAt.has(e.to_stage)) reachedAt.set(e.to_stage, String(e.created_at ?? ""));
    }
  }

  const order = DEAL_STEPS.map((s) => s.stage);
  const currentIdx = deal?.stage ? order.indexOf(deal.stage as DealStage) : -1;
  const milestones = DEAL_STEPS.map((s, i) => ({
    stage: s.stage,
    label: s.label,
    reached: currentIdx >= 0 && i <= currentIdx,
    at: reachedAt.get(s.stage) || undefined,
  }));

  return {
    ref,
    title: String(p.title ?? ""),
    municipality: String(p.municipality ?? ""),
    status: (p.status as PropertyStatus) ?? null,
    offMarket: Boolean(p.off_market),
    interest: p.interest != null ? Number(p.interest) : 0,
    visitsScheduled,
    visitsDone,
    leadsCount: leadsCount ?? 0,
    dealStage: (deal?.stage as DealStage) ?? null,
    milestones,
  };
}
