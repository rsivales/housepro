import { randomBytes } from "crypto";

import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { DEAL_STEPS, type DealStage } from "@/lib/data/deal";

/** Garante um token de portal do comprador para o contacto e devolve-o. */
export async function ensureBuyerPortalToken(contactId: string): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("contacts").select("portal_token").eq("id", contactId).maybeSingle();
  if (data?.portal_token) return String(data.portal_token);
  const token = randomBytes(24).toString("base64url");
  const { error } = await sb.from("contacts").update({ portal_token: token }).eq("id", contactId);
  if (error) return null;
  return token;
}

export interface BuyerPortal {
  name: string;
  propertyRef: string;
  propertyTitle: string;
  propertyImage: string | null;
  amount: number;
  dealStage: DealStage | null;
  milestones: { stage: DealStage; label: string; reached: boolean; at?: string }[];
}

/** Dados (só leitura) do portal do comprador a partir do token — o negócio
 *  mais recente em que o contacto está ligado como comprador. */
export async function getBuyerPortalData(token: string): Promise<BuyerPortal | null> {
  if (!hasServiceRole() || !token) return null;
  const sb = createAdminClient();
  const { data: contact } = await sb
    .from("contacts")
    .select("id, name")
    .eq("portal_token", token)
    .maybeSingle();
  if (!contact) return null;

  const { data: deal } = await sb
    .from("deals")
    .select("id, stage, amount, property:properties!property_id(reference, title, cover_url)")
    .eq("buyer_contact_id", contact.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!deal) {
    return { name: String(contact.name ?? ""), propertyRef: "", propertyTitle: "", propertyImage: null, amount: 0, dealStage: null, milestones: [] };
  }

  const reachedAt = new Map<string, string>();
  const { data: events } = await sb
    .from("deal_events")
    .select("to_stage, created_at")
    .eq("deal_id", deal.id)
    .order("created_at", { ascending: true });
  for (const e of (events ?? []) as { to_stage?: string; created_at?: string }[]) {
    if (e.to_stage && !reachedAt.has(e.to_stage)) reachedAt.set(e.to_stage, String(e.created_at ?? ""));
  }

  const order = DEAL_STEPS.map((s) => s.stage);
  const currentIdx = deal.stage ? order.indexOf(deal.stage as DealStage) : -1;
  const milestones = DEAL_STEPS.map((s, i) => ({
    stage: s.stage,
    label: s.label,
    reached: currentIdx >= 0 && i <= currentIdx,
    at: reachedAt.get(s.stage) || undefined,
  }));

  const p = (Array.isArray(deal.property) ? deal.property[0] : deal.property) as
    | { reference?: string; title?: string; cover_url?: string }
    | null;

  return {
    name: String(contact.name ?? ""),
    propertyRef: p?.reference ?? "",
    propertyTitle: p?.title ?? "",
    propertyImage: p?.cover_url || null,
    amount: deal.amount != null ? Number(deal.amount) : 0,
    dealStage: (deal.stage as DealStage) ?? null,
    milestones,
  };
}
