import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  availableProperties,
  propertiesByAgent as mockByAgent,
  propertiesByAgency as mockByAgency,
  soldByAgency as mockSoldByAgency,
  similarProperties as mockSimilar,
  propertyById as mockById,
} from "@/lib/data/mock";
import { leadsByOwner } from "@/lib/data/leads";
import type { Lead } from "@/lib/data/leads";
import type { Agent, Property } from "@/lib/data/types";

/**
 * Data-access layer. Reads from Supabase when configured, otherwise falls back
 * to the in-memory mock — so the app runs everywhere and pages migrate to the
 * database transparently as the rest of M2 lands.
 */

type Row = Record<string, unknown>;

const AGENT_COLS =
  "id, name, role, role_key, agency, agency_id, whatsapp, photo_url, accent";

function mapAgent(a: Row | null | undefined): Agent | undefined {
  if (!a) return undefined;
  return {
    id: String(a.id ?? ""),
    name: String(a.name ?? ""),
    role: String(a.role ?? "agente"),
    roleKey: (a.role_key as Agent["roleKey"]) ?? undefined,
    agency: String(a.agency ?? ""),
    agencyId: String(a.agency_id ?? ""),
    whatsapp: String(a.whatsapp ?? ""),
    accent: String(a.accent ?? "var(--brand)"),
    photo: (a.photo_url as string) ?? undefined,
  };
}

function mapRow(r: Row): Property {
  return {
    id: String(r.id),
    reference: String(r.reference ?? ""),
    title: String(r.title ?? ""),
    operation: (r.operation as Property["operation"]) ?? "venda",
    type: (r.type as Property["type"]) ?? "Apartamento",
    typology: (r.typology as string | null) ?? null,
    price: Number(r.price ?? 0),
    area: Number(r.area ?? 0),
    beds: Number(r.beds ?? 0),
    baths: Number(r.baths ?? 0),
    parish: String(r.parish ?? ""),
    municipality: String(r.municipality ?? ""),
    district: (r.district as string) ?? undefined,
    isDevelopment: r.is_development != null ? Boolean(r.is_development) : undefined,
    developmentName: (r.development_name as string) ?? undefined,
    developmentStage: (r.development_stage as Property["developmentStage"]) ?? undefined,
    developmentUnits: r.development_units != null ? Number(r.development_units) : undefined,
    energy: (r.energy as Property["energy"]) ?? "C",
    status: (r.status as Property["status"]) ?? null,
    image: String(r.cover_url ?? ""),
    gallery: Array.isArray(r.gallery) && r.gallery.length ? (r.gallery as string[]) : undefined,
    videoUrl: (r.video_url as string) ?? undefined,
    tourUrl: (r.tour_url as string) ?? undefined,
    beforeAfter: Array.isArray(r.before_after)
      ? (r.before_after as Property["beforeAfter"])
      : undefined,
    shortDescription: (r.short_description as string) ?? undefined,
    description: (r.description as string) ?? undefined,
    areaUtil: r.area_util != null ? Number(r.area_util) : undefined,
    areaDependente: r.area_dependente != null ? Number(r.area_dependente) : undefined,
    landArea: r.land_area != null ? Number(r.land_area) : undefined,
    garage: r.garage != null ? Boolean(r.garage) : undefined,
    elevator: r.elevator != null ? Boolean(r.elevator) : undefined,
    constructionYear: r.construction_year != null ? Number(r.construction_year) : undefined,
    lat: r.latitude != null ? Number(r.latitude) : undefined,
    lng: r.longitude != null ? Number(r.longitude) : undefined,
    commissionType: (r.commission_type as "percent" | "fixed") ?? undefined,
    commissionPct: r.commission_pct != null ? Number(r.commission_pct) : undefined,
    commissionFixed: r.commission_fixed != null ? Number(r.commission_fixed) : undefined,
    documents: Array.isArray(r.document_kinds) ? (r.document_kinds as string[]) : undefined,
    sellerType: (r.seller_type as "particular" | "empresa") ?? undefined,
    approval: (r.approval as Property["approval"]) ?? undefined,
    submittedAt: (r.submitted_at as string) ?? undefined,
    agent: mapAgent((r.agent ?? r.profiles) as Row | null | undefined),
    agentId: String(r.agent_id ?? ""),
    interest: r.interest != null ? Number(r.interest) : undefined,
    listedAt: (r.listed_at as string) ?? undefined,
    soldAt: (r.sold_at as string) ?? undefined,
  };
}

export async function listPropertiesByAgent(agentId: string): Promise<Property[]> {
  if (!isSupabaseConfigured()) return mockByAgent(agentId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, agent:profiles!agent_id(${AGENT_COLS})`)
    .eq("agent_id", agentId)
    .neq("status", "vendido")
    .order("listed_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  if (!isSupabaseConfigured()) return mockById(id) ?? null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, agent:profiles!agent_id(${AGENT_COLS})`)
    .eq("id", id)
    .single();
  return data ? mapRow(data) : null;
}

export async function listProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured()) return availableProperties;

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, agent:profiles!agent_id(${AGENT_COLS})`)
    .neq("status", "vendido")
    .eq("approval", "aprovado")
    .order("listed_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

/** Empreendimentos novos (obra nova) publicados — categoria própria da montra. */
export async function listDevelopments(): Promise<Property[]> {
  if (!isSupabaseConfigured()) {
    return availableProperties.filter((p) => p.isDevelopment);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, agent:profiles!agent_id(${AGENT_COLS})`)
    .eq("is_development", true)
    .neq("status", "vendido")
    .eq("approval", "aprovado")
    .order("listed_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function listPropertiesByAgency(agencyId: string): Promise<Property[]> {
  if (!isSupabaseConfigured()) return mockByAgency(agencyId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, profiles!inner(${AGENT_COLS})`)
    .eq("profiles.agency_id", agencyId)
    .neq("status", "vendido")
    .eq("approval", "aprovado")
    .order("listed_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function listSoldByAgency(agencyId: string): Promise<Property[]> {
  if (!isSupabaseConfigured()) return mockSoldByAgency(agencyId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, profiles!inner(${AGENT_COLS})`)
    .eq("profiles.agency_id", agencyId)
    .eq("status", "vendido")
    .order("sold_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function listSimilarProperties(
  property: Property,
  limit = 3
): Promise<Property[]> {
  if (!isSupabaseConfigured()) return mockSimilar(property, limit);

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`*, agent:profiles!agent_id(${AGENT_COLS})`)
    .neq("id", property.id)
    .neq("status", "vendido")
    .eq("approval", "aprovado")
    .eq("municipality", property.municipality)
    .limit(limit);
  return (data ?? []).map(mapRow);
}

// --- Afilhados / rede de padrinhado ----------------------------------------

import type { AfilhadoNode } from "@/lib/data/afilhados";
import { demoAfilhados, uplineOf } from "@/lib/data/afilhados";
import { maxOverrideDepth } from "@/lib/commission/split";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  amount?: number;
  href?: string;
  read: boolean;
  createdAt: string;
}

/** Árvore de afilhados enraizada no consultor `rootId`. Lê de Supabase quando
 *  configurado (via profiles.sponsor_id); caso contrário devolve a demo. */
export async function getAfilhadosTree(
  rootId: string,
  rootName = "Você (eu)"
): Promise<AfilhadoNode> {
  if (!isSupabaseConfigured()) return demoAfilhados;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, whatsapp, sponsor_id, monthly_gross, created_at, network_active");
  const rows = (data ?? []) as Row[];

  // Filhos por padrinho.
  const childrenOf = new Map<string, Row[]>();
  for (const r of rows) {
    const sid = r.sponsor_id ? String(r.sponsor_id) : null;
    if (!sid) continue;
    (childrenOf.get(sid) ?? childrenOf.set(sid, []).get(sid)!).push(r);
  }

  const maxDepth = maxOverrideDepth();
  const build = (r: Row | undefined, id: string, name: string, depth: number): AfilhadoNode => {
    const gross = Number(r?.monthly_gross ?? 0);
    const kids = depth < maxDepth ? childrenOf.get(id) ?? [] : [];
    return {
      id,
      name,
      contact: "",
      joinedAt: String(r?.created_at ?? new Date().toISOString()),
      active: gross > 0,
      inactive: r?.network_active === false,
      monthlyGross: gross,
      children: kids.map((k) => build(k, String(k.id), String(k.name ?? "Consultor"), depth + 1)),
    };
  };

  const rootRow = rows.find((r) => String(r.id) === rootId);
  return build(rootRow, rootId, rootName, 0);
}

/** Cadeia de padrinhos (upline) de um consultor, do direto para cima. */
export async function getUplineChain(
  producerId: string
): Promise<{ id: string; name: string }[]> {
  const depth = maxOverrideDepth();
  if (!isSupabaseConfigured()) {
    return uplineOf(demoAfilhados, producerId).slice(0, depth);
  }
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, name, sponsor_id");
  const byId = new Map((data ?? []).map((r: Row) => [String(r.id), r]));
  const chain: { id: string; name: string }[] = [];
  let cur = byId.get(producerId);
  while (cur && cur.sponsor_id && chain.length < depth) {
    const p = byId.get(String(cur.sponsor_id));
    if (!p) break;
    chain.push({ id: String(p.id), name: String(p.name ?? "Consultor") });
    cur = p;
  }
  return chain;
}

/** Faturação acumulada do mês/ciclo do consultor (0 em modo demo). */
export async function getMonthlyGross(agentId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("monthly_gross")
      .eq("id", agentId)
      .single();
    return Number(data?.monthly_gross ?? 0);
  } catch {
    return 0;
  }
}

/** Vínculo do agente: tem empresa própria VALIDADA (escalão +10 pontos)? */
export async function getAgentCompanyValidated(agentId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo assume validada
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("company_validated")
      .eq("id", agentId)
      .single();
    return Boolean(data?.company_validated);
  } catch {
    return false;
  }
}

/** Credita comissão bruta ao mês do consultor (base do override). */
export async function addMonthlyGross(agentId: string, gross: number): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("monthly_gross")
      .eq("id", agentId)
      .single();
    const current = Number(data?.monthly_gross ?? 0);
    await supabase.from("profiles").update({ monthly_gross: current + gross }).eq("id", agentId);
  } catch {
    /* best-effort */
  }
}

/** Insere notificações (best-effort). */
export async function insertNotifications(
  rows: { userId: string; type: string; title: string; body?: string; amount?: number; href?: string }[]
): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) return;
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert(
      rows.map((r) => ({
        user_id: r.userId,
        type: r.type,
        title: r.title,
        body: r.body ?? null,
        amount: r.amount ?? null,
        href: r.href ?? null,
      }))
    );
  } catch {
    /* best-effort */
  }
}

/** Notificações do consultor (mais recentes primeiro). */
export async function listNotifications(userId: string, limit = 20): Promise<Notification[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: Row) => ({
    id: String(r.id),
    type: String(r.type ?? "info"),
    title: String(r.title ?? ""),
    body: (r.body as string) ?? undefined,
    amount: r.amount != null ? Number(r.amount) : undefined,
    href: (r.href as string) ?? undefined,
    read: Boolean(r.read),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }));
}

/** Mapa de artes dos prémios (nome→URL), lido do Supabase (server). */
export async function getPrizeArt(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "prizeArt")
      .maybeSingle();
    return (data?.value as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

// --- Leads -----------------------------------------------------------------

export interface NewLead {
  propertyId?: string;
  ownerId: string;
  referrerId?: string;
  name: string;
  contact: string;
  email?: string;
  intent: Lead["intent"];
  message?: string;
  preferredAt?: string;
  source?: Lead["source"];
}

/** Regista uma lead. Grava no Supabase quando configurado; caso contrário
 *  devolve-a (modo demo) para o fluxo poder ser testado ponta a ponta. */
export async function createLead(input: NewLead): Promise<Lead> {
  const lead: Lead = {
    id: `l-${Date.now()}`,
    status: "novo",
    source: input.source ?? "site",
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (!isSupabaseConfigured()) return lead;

  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .insert({
      property_id: input.propertyId ?? null,
      owner_id: input.ownerId,
      referrer_id: input.referrerId ?? null,
      name: input.name,
      contact: input.contact,
      message: input.message ?? null,
      source: input.source ?? "site",
    })
    .select("id, created_at")
    .single();
  return { ...lead, id: data ? String(data.id) : lead.id };
}

export async function listLeadsByAgent(agentId: string): Promise<Lead[]> {
  if (!isSupabaseConfigured()) return leadsByOwner(agentId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("owner_id", agentId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: Row) => ({
    id: String(r.id),
    propertyId: (r.property_id as string) ?? undefined,
    ownerId: String(r.owner_id ?? ""),
    referrerId: (r.referrer_id as string) ?? undefined,
    name: String(r.name ?? ""),
    contact: String(r.contact ?? ""),
    intent: (r.intent as Lead["intent"]) ?? "mensagem",
    message: (r.message as string) ?? undefined,
    preferredAt: (r.preferred_at as string) ?? undefined,
    source: (r.source as Lead["source"]) ?? "site",
    status: (r.status as Lead["status"]) ?? "novo",
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }));
}
