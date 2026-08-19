import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  availableProperties,
  propertiesByAgent as mockByAgent,
  propertiesByAgency as mockByAgency,
  soldByAgency as mockSoldByAgency,
  similarProperties as mockSimilar,
  propertyById as mockById,
  agencies as baseAgencies,
} from "@/lib/data/mock";
import { leadsByOwner } from "@/lib/data/leads";
import type { Lead } from "@/lib/data/leads";
import { DEFAULT_CONCELHOS_CONFIG, type ConcelhosConfig } from "@/lib/data/concelhos";
import { DEFAULT_AGENCIES_CONFIG, mergeAgencies, type AgenciesConfig } from "@/lib/data/agencies";
import type { AuditEntry } from "@/lib/data/audit";
import { SEVERITY, type QualityEvent, type QualitySeverity, type QualityCategory } from "@/lib/data/quality";
import type { Agency, Agent, Property } from "@/lib/data/types";

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

/** Configuração da secção "Concelhos mais procurados" (site_settings). */
export async function getConcelhosConfig(): Promise<ConcelhosConfig> {
  if (!isSupabaseConfigured()) return DEFAULT_CONCELHOS_CONFIG;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "concelhos")
      .maybeSingle();
    const v = data?.value as Partial<ConcelhosConfig> | undefined;
    return { ...DEFAULT_CONCELHOS_CONFIG, ...(v ?? {}), photos: v?.photos ?? {} };
  } catch {
    return DEFAULT_CONCELHOS_CONFIG;
  }
}

/** Histórico de rastreio de um imóvel (quem alterou o quê e quando). */
export async function listPropertyAudit(propertyId: string): Promise<AuditEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("property_audit")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      propertyId: String(r.property_id ?? propertyId),
      propertyRef: (r.property_ref as string) ?? undefined,
      actorId: String(r.actor_id ?? ""),
      actorName: String(r.actor_name ?? "—"),
      actorRole: (r.actor_role as string) ?? undefined,
      action: String(r.action ?? "editou"),
      changes: (r.changes as AuditEntry["changes"]) ?? undefined,
      at: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

/** Configuração de gestão de agências (site_settings, chave "agencies"). */
export async function getAgenciesConfig(): Promise<AgenciesConfig> {
  if (!isSupabaseConfigured()) return DEFAULT_AGENCIES_CONFIG;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "agencies")
      .maybeSingle();
    const v = data?.value as Partial<AgenciesConfig> | undefined;
    return { overrides: v?.overrides ?? {}, created: v?.created ?? [] };
  } catch {
    return DEFAULT_AGENCIES_CONFIG;
  }
}

/** Agências da rede com as edições/criações aplicadas (para o site público). */
export async function getMergedAgencies(): Promise<Agency[]> {
  const config = await getAgenciesConfig();
  return mergeAgencies(baseAgencies, config);
}

/** Agência por slug, já com as edições aplicadas. */
export async function getAgencyBySlug(slug: string): Promise<Agency | undefined> {
  return (await getMergedAgencies()).find((a) => a.slug === slug);
}

/** Agência por id, já com as edições aplicadas. */
export async function getAgencyByIdMerged(id: string): Promise<Agency | undefined> {
  return (await getMergedAgencies()).find((a) => a.id === id);
}

// --- Qualidade -------------------------------------------------------------

/** Insere uma infração PROPOSTA (best-effort), evitando duplicar a mesma
 *  ocorrência (mesmo agente + negócio + categoria ainda por decidir). Devolve
 *  true se criou uma nova (para o chamador notificar). */
export async function insertQualityInfraction(input: {
  agentId: string;
  severity: QualitySeverity;
  category: QualityCategory;
  reason: string;
  dealRef?: string;
  createdBy?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume criada
  const sev = SEVERITY[input.severity] ?? SEVERITY.leve;
  try {
    const supabase = await createClient();
    if (input.dealRef) {
      const { data: dup } = await supabase
        .from("quality_events")
        .select("id")
        .eq("agent_id", input.agentId)
        .eq("deal_ref", input.dealRef)
        .eq("category", input.category)
        .in("status", ["proposta", "contestada"])
        .limit(1);
      if (dup && dup.length > 0) return false; // já sinalizada
    }
    await supabase.from("quality_events").insert({
      kind: "infracao",
      agent_id: input.agentId,
      category: input.category,
      severity: input.severity,
      points: -sev.points,
      amount: sev.amount,
      reason: input.reason,
      status: "proposta",
      deal_ref: input.dealRef ?? null,
      created_by: input.createdBy ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Eventos de qualidade (méritos + infrações) de um consultor. Vazio em demo,
 *  para a página cair no livro-razão de exemplo. */
export async function listQualityEvents(agentId: string): Promise<QualityEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("quality_events")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      kind: (r.kind as QualityEvent["kind"]) ?? "infracao",
      agentId: String(r.agent_id ?? agentId),
      category: (r.category as QualityEvent["category"]) ?? undefined,
      severity: (r.severity as QualityEvent["severity"]) ?? undefined,
      points: Number(r.points ?? 0),
      amount: Number(r.amount ?? 0),
      reason: String(r.reason ?? ""),
      status: (r.status as QualityEvent["status"]) ?? undefined,
      origin: (r.origin as QualityEvent["origin"]) ?? undefined,
      submittedBy: (r.submitted_by as string) ?? undefined,
      contestNote: (r.contest_note as string) ?? undefined,
      reassignedTo: (r.reassigned_to as string) ?? undefined,
      residualPct: r.residual_pct != null ? Number(r.residual_pct) : undefined,
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

/** Regista um reparo (best-effort) evitando duplicar por negócio/contacto. */
export async function insertQualityReparo(input: {
  agentId: string;
  category: string;
  reason: string;
  dealRef?: string;
  status?: string;
  origin?: string;
  reassignedTo?: string;
  residualPct?: number;
  createdBy?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume criado
  try {
    const supabase = await createClient();
    if (input.dealRef) {
      const { data: dup } = await supabase
        .from("quality_events")
        .select("id")
        .eq("agent_id", input.agentId)
        .eq("deal_ref", input.dealRef)
        .eq("category", input.category)
        .in("status", ["pendente", "ativo"])
        .limit(1);
      if (dup && dup.length > 0) return false;
    }
    await supabase.from("quality_events").insert({
      kind: "reparo",
      agent_id: input.agentId,
      category: input.category,
      points: 0,
      amount: 0,
      reason: input.reason,
      status: input.status ?? "ativo",
      origin: input.origin ?? "manual",
      deal_ref: input.dealRef ?? null,
      reassigned_to: input.reassignedTo ?? null,
      residual_pct: input.residualPct ?? null,
      created_by: input.createdBy ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Fecha o reparo de abandono de um contacto marcando a reatribuição. */
export async function resolveContactReparo(
  agentId: string,
  dealRef: string,
  toAgentId: string,
  residualPct: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase
      .from("quality_events")
      .update({ status: "resolvido", reassigned_to: toAgentId, residual_pct: residualPct })
      .eq("agent_id", agentId)
      .eq("deal_ref", dealRef)
      .eq("category", "abandono")
      .eq("status", "ativo");
  } catch {
    /* best-effort */
  }
}

/** Reatribui o dono de uma lead (best-effort). */
export async function reassignLeadOwner(leadId: string, toAgentId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase.from("leads").update({ owner_id: toAgentId }).eq("id", leadId);
  } catch {
    /* best-effort */
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
  return (data ?? []).map(mapLeadRow);
}

/** Mapeia uma linha da tabela `leads` para o modelo Lead (inclui campos Meta). */
function mapLeadRow(r: Row): Lead {
  return {
    id: String(r.id),
    propertyId: (r.property_id as string) ?? undefined,
    propertyRef: (r.property_ref as string) ?? undefined,
    ownerId: String(r.owner_id ?? ""),
    referrerId: (r.referrer_id as string) ?? undefined,
    name: String(r.name ?? ""),
    contact: String(r.contact ?? ""),
    email: (r.email as string) ?? undefined,
    intent: (r.intent as Lead["intent"]) ?? "mensagem",
    message: (r.message as string) ?? undefined,
    preferredAt: (r.preferred_at as string) ?? undefined,
    source: (r.source as Lead["source"]) ?? "site",
    status: (r.status as Lead["status"]) ?? "novo",
    createdAt: String(r.created_at ?? new Date().toISOString()),
    campaignId: (r.campaign_id as string) ?? undefined,
    formId: (r.form_id as string) ?? undefined,
    commercialOriginId: (r.commercial_origin_id as string) ?? undefined,
    assignedAgentId: (r.assigned_agent_id as string) ?? undefined,
    assignedTeamId: (r.assigned_team_id as string) ?? undefined,
    pipeline: (r.pipeline as string) ?? undefined,
    stage: r.stage != null ? Number(r.stage) : undefined,
    qualification: (r.qualification as Lead["qualification"]) ?? undefined,
    score: r.score != null ? Number(r.score) : undefined,
    unassigned: r.unassigned != null ? Boolean(r.unassigned) : undefined,
    zone: (r.zone as string) ?? undefined,
    budget: (r.budget as string) ?? undefined,
    language: (r.language as string) ?? undefined,
    specialty: (r.specialty as string) ?? undefined,
    offeredTo: Array.isArray(r.offered_to) ? (r.offered_to as string[]) : undefined,
    externalId: (r.external_id as string) ?? undefined,
    consent: (r.consent as Lead["consent"]) ?? undefined,
  };
}

// --- Módulo Meta CRM -------------------------------------------------------

import {
  demoMetaConnection,
  demoCampaigns,
  demoLeadForms,
  demoAssignmentRules,
  fieldMappingForForm,
  type MetaConnection,
  type Campaign,
  type LeadForm,
  type FieldMapping,
  type AssignmentRule,
  type LeadActivity,
  type LeadAnswer,
} from "@/lib/data/meta";
import {
  metaLeadsByAgent,
  unassignedMetaLeads,
  allMetaLeads,
} from "@/lib/data/leads";

/** Ligação Meta ativa (ou a de demonstração). */
export async function getMetaConnection(): Promise<MetaConnection> {
  if (!isSupabaseConfigured()) return demoMetaConnection;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("meta_connections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { ...demoMetaConnection, status: "desligada" };
    return {
      id: String(data.id),
      pageId: String(data.page_id ?? ""),
      pageName: (data.page_name as string) ?? undefined,
      igId: (data.ig_id as string) ?? undefined,
      igName: (data.ig_name as string) ?? undefined,
      tokenRef: (data.token_ref as string) ?? undefined,
      scopes: Array.isArray(data.scopes) ? (data.scopes as string[]) : [],
      status: (data.status as MetaConnection["status"]) ?? "desligada",
      connectedAt: (data.connected_at as string) ?? undefined,
    };
  } catch {
    return { ...demoMetaConnection, status: "erro" };
  }
}

/** Campanhas (todas — gestão). */
export async function listCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured()) return demoCampaigns;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      type: (r.type as Campaign["type"]) ?? "OTHER",
      ownerType: (r.owner_type as Campaign["ownerType"]) ?? "AGENCY",
      ownerId: String(r.owner_id ?? ""),
      responsibleId: (r.responsible_id as string) ?? undefined,
      objective: (r.objective as string) ?? undefined,
      metaCampaignId: (r.meta_campaign_id as string) ?? undefined,
      status: (r.status as Campaign["status"]) ?? "rascunho",
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return demoCampaigns;
  }
}

/** Formulários Meta (todos, ou de uma campanha). */
export async function listLeadForms(campaignId?: string): Promise<LeadForm[]> {
  if (!isSupabaseConfigured()) {
    return campaignId
      ? demoLeadForms.filter((f) => f.campaignId === campaignId)
      : demoLeadForms;
  }
  try {
    const supabase = await createClient();
    let q = supabase.from("lead_forms").select("*, lead_form_questions(*)");
    if (campaignId) q = q.eq("campaign_id", campaignId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      metaFormId: String(r.meta_form_id ?? ""),
      name: String(r.name ?? ""),
      campaignId: (r.campaign_id as string) ?? undefined,
      createdAt: String(r.created_at ?? new Date().toISOString()),
      questions: Array.isArray(r.lead_form_questions)
        ? (r.lead_form_questions as Row[])
            .map((q2) => ({
              key: String(q2.key ?? ""),
              label: String(q2.label ?? ""),
              type: (q2.type as LeadForm["questions"][number]["type"]) ?? "text",
              options: Array.isArray(q2.options) ? (q2.options as string[]) : undefined,
            }))
        : [],
    }));
  } catch {
    return demoLeadForms;
  }
}

/** Mapeamento pergunta→campo de um formulário. */
export async function getFieldMapping(formId: string): Promise<FieldMapping | undefined> {
  if (!isSupabaseConfigured()) return fieldMappingForForm(formId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("field_mappings")
      .select("*")
      .eq("form_id", formId);
    if (!data || data.length === 0) return fieldMappingForForm(formId);
    return {
      formId,
      map: data.map((r: Row) => ({
        questionKey: String(r.question_key ?? ""),
        leadField: (r.lead_field as FieldMapping["map"][number]["leadField"]) ?? "custom",
        note: (r.note as string) ?? undefined,
      })),
    };
  } catch {
    return fieldMappingForForm(formId);
  }
}

/** Regras de atribuição (todas, ou de uma campanha). */
export async function listAssignmentRules(campaignId?: string): Promise<AssignmentRule[]> {
  if (!isSupabaseConfigured()) {
    return campaignId
      ? demoAssignmentRules.filter((r) => r.campaignId === campaignId)
      : demoAssignmentRules;
  }
  try {
    const supabase = await createClient();
    let q = supabase.from("assignment_rules").select("*");
    if (campaignId) q = q.eq("campaign_id", campaignId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      campaignId: String(r.campaign_id ?? ""),
      strategy: (r.strategy as AssignmentRule["strategy"]) ?? "unassigned",
      agentId: (r.agent_id as string) ?? undefined,
      teamId: (r.team_id as string) ?? undefined,
      pool: Array.isArray(r.pool) ? (r.pool as string[]) : undefined,
      rrIndex: r.rr_index != null ? Number(r.rr_index) : undefined,
      weights: (r.weights as Record<string, number>) ?? undefined,
      zoneMap: (r.zone_map as Record<string, string>) ?? undefined,
      budgetMap: (r.budget_map as Record<string, string>) ?? undefined,
      languageMap: (r.language_map as Record<string, string>) ?? undefined,
      specialtyMap: (r.specialty_map as Record<string, string>) ?? undefined,
      substituteId: (r.substitute_id as string) ?? undefined,
      fallbackId: (r.fallback_id as string) ?? undefined,
      dailyLimit: r.daily_limit != null ? Number(r.daily_limit) : undefined,
      acceptanceDeadlineH: r.acceptance_deadline_h != null ? Number(r.acceptance_deadline_h) : undefined,
      notifyManagerId: (r.notify_manager_id as string) ?? undefined,
      active: r.active != null ? Boolean(r.active) : true,
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return demoAssignmentRules;
  }
}

/** Leads Meta do agente (responsável atual OU origem comercial). */
export async function listMetaLeadsByAgent(agentId: string): Promise<Lead[]> {
  if (!isSupabaseConfigured()) return metaLeadsByAgent(agentId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .not("campaign_id", "is", null)
      .or(`assigned_agent_id.eq.${agentId},commercial_origin_id.eq.${agentId}`)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapLeadRow);
  } catch {
    return metaLeadsByAgent(agentId);
  }
}

/** Leads Meta sem responsável (inbox). */
export async function listUnassignedMetaLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured()) return unassignedMetaLeads();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .not("campaign_id", "is", null)
      .eq("unassigned", true)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapLeadRow);
  } catch {
    return unassignedMetaLeads();
  }
}

/** Todas as leads Meta (gestão/relatórios), opcionalmente por pipeline. */
export async function listAllMetaLeads(pipeline?: string): Promise<Lead[]> {
  if (!isSupabaseConfigured()) return allMetaLeads(pipeline);
  try {
    const supabase = await createClient();
    let q = supabase.from("leads").select("*").not("campaign_id", "is", null);
    if (pipeline) q = q.eq("pipeline", pipeline);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map(mapLeadRow);
  } catch {
    return allMetaLeads(pipeline);
  }
}

/** Cria uma campanha. Grava no Supabase quando configurado; em demo devolve
 *  o objeto construído (para o fluxo ser testável ponta-a-ponta). */
export async function createCampaign(input: {
  name: string;
  type: Campaign["type"];
  ownerType: Campaign["ownerType"];
  ownerId: string;
  ownerName?: string;
  responsibleId?: string;
  responsibleName?: string;
  objective?: string;
  metaCampaignId?: string;
  status?: Campaign["status"];
  createdBy?: string;
}): Promise<Campaign> {
  const campaign: Campaign = {
    id: `cmp-${Date.now()}`,
    name: input.name,
    type: input.type,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    responsibleId: input.responsibleId,
    responsibleName: input.responsibleName,
    objective: input.objective,
    metaCampaignId: input.metaCampaignId,
    status: input.status ?? "rascunho",
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured()) return campaign;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("campaigns")
      .insert({
        name: input.name,
        type: input.type,
        owner_type: input.ownerType,
        owner_id: input.ownerId,
        responsible_id: input.responsibleId ?? null,
        objective: input.objective ?? null,
        meta_campaign_id: input.metaCampaignId ?? null,
        status: input.status ?? "rascunho",
        created_by: input.createdBy ?? null,
      })
      .select("id")
      .single();
    return { ...campaign, id: data ? String(data.id) : campaign.id };
  } catch {
    return campaign;
  }
}

/** Cria/atualiza a regra de atribuição de uma campanha (uma ativa por campanha). */
export async function saveAssignmentRule(input: {
  campaignId: string;
  strategy: AssignmentRule["strategy"];
  agentId?: string;
  teamId?: string;
  pool?: string[];
  weights?: Record<string, number>;
  zoneMap?: Record<string, string>;
  budgetMap?: Record<string, string>;
  languageMap?: Record<string, string>;
  specialtyMap?: Record<string, string>;
  substituteId?: string;
  fallbackId?: string;
  dailyLimit?: number;
  acceptanceDeadlineH?: number;
  notifyManagerId?: string;
}): Promise<AssignmentRule> {
  const rule: AssignmentRule = {
    id: `rule-${Date.now()}`,
    campaignId: input.campaignId,
    strategy: input.strategy,
    agentId: input.agentId,
    teamId: input.teamId,
    pool: input.pool,
    weights: input.weights,
    zoneMap: input.zoneMap,
    budgetMap: input.budgetMap,
    languageMap: input.languageMap,
    specialtyMap: input.specialtyMap,
    substituteId: input.substituteId,
    fallbackId: input.fallbackId,
    dailyLimit: input.dailyLimit,
    acceptanceDeadlineH: input.acceptanceDeadlineH,
    notifyManagerId: input.notifyManagerId,
    active: true,
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured()) return rule;
  try {
    const supabase = await createClient();
    // uma regra ativa por campanha: desativa as anteriores.
    await supabase.from("assignment_rules").update({ active: false }).eq("campaign_id", input.campaignId);
    const { data } = await supabase
      .from("assignment_rules")
      .insert({
        campaign_id: input.campaignId,
        strategy: input.strategy,
        agent_id: input.agentId ?? null,
        team_id: input.teamId ?? null,
        pool: input.pool ?? null,
        weights: input.weights ?? null,
        zone_map: input.zoneMap ?? null,
        budget_map: input.budgetMap ?? null,
        language_map: input.languageMap ?? null,
        specialty_map: input.specialtyMap ?? null,
        substitute_id: input.substituteId ?? null,
        fallback_id: input.fallbackId ?? null,
        daily_limit: input.dailyLimit ?? null,
        acceptance_deadline_h: input.acceptanceDeadlineH ?? null,
        notify_manager_id: input.notifyManagerId ?? null,
        active: true,
      })
      .select("id")
      .single();
    return { ...rule, id: data ? String(data.id) : rule.id };
  } catch {
    return rule;
  }
}

/** Guarda o mapeamento pergunta→campo de um formulário (substitui o existente). */
export async function saveFieldMapping(
  formId: string,
  entries: FieldMapping["map"]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume guardado
  try {
    const supabase = await createClient();
    await supabase.from("field_mappings").delete().eq("form_id", formId);
    if (entries.length) {
      await supabase.from("field_mappings").insert(
        entries.map((e) => ({
          form_id: formId,
          question_key: e.questionKey,
          lead_field: e.leadField,
          note: e.note ?? null,
        }))
      );
    }
    return true;
  } catch {
    return false;
  }
}

/** Regista uma entrada na linha do tempo de uma lead (best-effort). */
export async function addLeadActivity(input: {
  leadId: string;
  type: LeadActivity["type"];
  actorId?: string;
  actorName?: string;
  note?: string;
  from?: string;
  to?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      type: input.type,
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      note: input.note ?? null,
      from_val: input.from ?? null,
      to_val: input.to ?? null,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Recebe uma lead do Meta já normalizada e persiste-a (lead + respostas +
 * atividade "created"). Em modo demo devolve o objeto construído sem persistir,
 * para o fluxo ponta-a-ponta ser demonstrável sem Supabase nem Meta reais.
 */
export async function ingestMetaLead(input: {
  lead: Partial<Lead>;
  answers: Omit<LeadAnswer, "leadId">[];
}): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: `ml-${Date.now()}`,
    ownerId: "",
    name: "Sem nome",
    contact: "",
    intent: "mensagem",
    source: "facebook",
    status: "novo",
    createdAt: now,
    ...input.lead,
  };

  if (!isSupabaseConfigured()) return lead;

  try {
    const supabase = await createClient();

    // Idempotência: se já existe uma lead com o mesmo leadgen_id, devolve-a
    // (não duplica na reentrega de webhooks).
    if (lead.externalId) {
      const { data: dup } = await supabase
        .from("leads")
        .select("*")
        .eq("external_id", lead.externalId)
        .maybeSingle();
      if (dup) return mapLeadRow(dup as Row);
    }

    const { data } = await supabase
      .from("leads")
      .insert({
        name: lead.name,
        contact: lead.contact,
        email: lead.email ?? null,
        message: lead.message ?? null,
        intent: lead.intent,
        preferred_at: lead.preferredAt ?? null,
        source: lead.source,
        status: lead.status,
        property_id: lead.propertyId ?? null,
        property_ref: lead.propertyRef ?? null,
        owner_id: lead.ownerId || null,
        campaign_id: lead.campaignId ?? null,
        form_id: lead.formId ?? null,
        commercial_origin_id: lead.commercialOriginId || null,
        assigned_agent_id: lead.assignedAgentId ?? null,
        assigned_team_id: lead.assignedTeamId ?? null,
        pipeline: lead.pipeline ?? null,
        stage: lead.stage ?? 0,
        qualification: lead.qualification ?? "novo",
        score: lead.score ?? null,
        unassigned: lead.unassigned ?? true,
        zone: lead.zone ?? null,
        budget: lead.budget ?? null,
        language: lead.language ?? null,
        specialty: lead.specialty ?? null,
        offered_to: lead.offeredTo ?? null,
        external_id: lead.externalId ?? null,
        consent: lead.consent ?? null,
      })
      .select("id")
      .single();
    const id = data ? String(data.id) : lead.id;

    if (input.answers.length) {
      await supabase.from("lead_answers").insert(
        input.answers.map((a) => ({
          lead_id: id,
          question_key: a.questionKey,
          label: a.label ?? null,
          value: a.value,
          pii: a.pii ?? false,
        }))
      );
    }
    await supabase.from("lead_activities").insert({
      lead_id: id,
      type: "created",
      note: "Lead recebida via Meta Lead Ads.",
    });
    return { ...lead, id };
  } catch {
    return lead;
  }
}

/** Atribui (ou reatribui) uma lead ao agente responsável atual e regista. */
export async function assignLead(input: {
  leadId: string;
  agentId?: string;
  agentName?: string;
  teamId?: string;
  reassign?: boolean;
  note?: string;
  actorId?: string;
  actorName?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume aplicado
  try {
    const supabase = await createClient();
    await supabase
      .from("leads")
      .update({
        assigned_agent_id: input.agentId ?? null,
        assigned_team_id: input.teamId ?? null,
        unassigned: false,
      })
      .eq("id", input.leadId);
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      type: input.reassign ? "reassigned" : "assigned",
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      note: input.note ?? null,
      to_val: input.agentName ?? input.agentId ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Move uma lead de etapa no pipeline (Kanban) e regista (dual). */
export async function updateLeadStage(input: {
  leadId: string;
  stage: number;
  pipeline?: string;
  actorId?: string;
  actorName?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume aplicado
  try {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { stage: input.stage };
    if (input.pipeline) patch.pipeline = input.pipeline;
    await supabase.from("leads").update(patch).eq("id", input.leadId);
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      type: "stage",
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      to_val: String(input.stage),
    });
    return true;
  } catch {
    return false;
  }
}

/** Qualifica/desqualifica uma lead e regista na linha do tempo (dual). */
export async function qualifyLead(input: {
  leadId: string;
  qualification: Lead["qualification"];
  score?: number;
  note?: string;
  actorId?: string;
  actorName?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume aplicado
  try {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { qualification: input.qualification };
    if (input.score != null) patch.score = input.score;
    await supabase.from("leads").update(patch).eq("id", input.leadId);
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      type: input.qualification === "desqualificado" ? "disqualified" : "qualified",
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      note: input.note ?? null,
      to_val: input.qualification ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * RGPD — anonimiza uma lead (direito ao apagamento): remove os dados pessoais
 * (nome, contacto, email, mensagem) e as respostas marcadas como PII, mantendo
 * a lead para estatística sem identificar o titular. Regista a operação.
 */
export async function anonymizeLead(input: {
  leadId: string;
  actorId?: string;
  actorName?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // demo: assume anonimizada
  try {
    const supabase = await createClient();
    await supabase
      .from("leads")
      .update({
        name: "[anonimizada]",
        contact: "",
        email: null,
        message: null,
        consent: null,
      })
      .eq("id", input.leadId);
    await supabase.from("lead_answers").delete().eq("lead_id", input.leadId).eq("pii", true);
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      type: "note",
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      note: "Lead anonimizada (RGPD — direito ao apagamento).",
    });
    return true;
  } catch {
    return false;
  }
}

// --- Contactos, cronologia, tarefas e agenda (F2) --------------------------

import {
  contactsByOwner as demoContactsByOwner,
  contactById as demoContactById,
  activitiesForContact as demoActivitiesForContact,
  tasksByOwner as demoTasksByOwner,
  visitsByOwner as demoVisitsByOwner,
  buildTimeline,
  type Contact,
  type ContactActivity,
  type Task,
  type Visit,
} from "@/lib/data/contacts";

function mapContact(r: Row): Contact {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    phone: (r.phone as string) ?? undefined,
    email: (r.email as string) ?? undefined,
    type: (r.type as Contact["type"]) ?? "outro",
    ownerId: String(r.owner_id ?? ""),
    agencyId: (r.agency_id as string) ?? undefined,
    zone: (r.zone as string) ?? undefined,
    budget: (r.budget as string) ?? undefined,
    language: (r.language as string) ?? undefined,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
    source: (r.source as string) ?? undefined,
    consent: (r.consent as Contact["consent"]) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    lastActivityAt: (r.last_activity_at as string) ?? undefined,
  };
}

function mapActivity(r: Row): ContactActivity {
  return {
    id: String(r.id),
    contactId: String(r.contact_id ?? ""),
    type: (r.type as ContactActivity["type"]) ?? "system",
    title: String(r.title ?? ""),
    body: (r.body as string) ?? undefined,
    actorId: (r.actor_id as string) ?? undefined,
    actorName: (r.actor_name as string) ?? undefined,
    direction: (r.direction as ContactActivity["direction"]) ?? undefined,
    leadId: (r.lead_id as string) ?? undefined,
    dealRef: (r.deal_ref as string) ?? undefined,
    propertyRef: (r.property_ref as string) ?? undefined,
    at: String(r.created_at ?? new Date().toISOString()),
  };
}

/** Contactos do consultor (mais recente atividade primeiro). */
export async function listContactsByOwner(ownerId: string): Promise<Contact[]> {
  if (!isSupabaseConfigured()) return demoContactsByOwner(ownerId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    return (data ?? []).map(mapContact);
  } catch {
    return demoContactsByOwner(ownerId);
  }
}

/** Contacto por id. */
export async function getContact(id: string): Promise<Contact | undefined> {
  if (!isSupabaseConfigured()) return demoContactById(id);
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
    return data ? mapContact(data as Row) : undefined;
  } catch {
    return demoContactById(id);
  }
}

/** Cria um contacto (dual). Em demo devolve o objeto construído. */
export async function createContact(input: {
  name: string;
  phone?: string;
  email?: string;
  type: Contact["type"];
  ownerId: string;
  agencyId?: string;
  zone?: string;
  budget?: string;
  language?: string;
  source?: string;
}): Promise<Contact> {
  const contact: Contact = {
    id: `ct-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (!isSupabaseConfigured()) return contact;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contacts")
      .insert({
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        type: input.type,
        owner_id: input.ownerId,
        agency_id: input.agencyId ?? null,
        zone: input.zone ?? null,
        budget: input.budget ?? null,
        language: input.language ?? null,
        source: input.source ?? null,
      })
      .select("id")
      .single();
    return { ...contact, id: data ? String(data.id) : contact.id };
  } catch {
    return contact;
  }
}

/** Cronologia única de um contacto (mais recente primeiro). */
export async function listContactActivities(contactId: string): Promise<ContactActivity[]> {
  if (!isSupabaseConfigured()) return demoActivitiesForContact(contactId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contact_activities")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    return buildTimeline((data ?? []).map(mapActivity));
  } catch {
    return demoActivitiesForContact(contactId);
  }
}

/** Acrescenta um evento à cronologia de um contacto (best-effort). */
export async function addContactActivity(input: {
  contactId: string;
  type: ContactActivity["type"];
  title: string;
  body?: string;
  actorId?: string;
  actorName?: string;
  direction?: ContactActivity["direction"];
  leadId?: string;
  dealRef?: string;
  propertyRef?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const supabase = await createClient();
    await supabase.from("contact_activities").insert({
      contact_id: input.contactId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      direction: input.direction ?? null,
      lead_id: input.leadId ?? null,
      deal_ref: input.dealRef ?? null,
      property_ref: input.propertyRef ?? null,
    });
    await supabase.from("contacts").update({ updated_at: new Date().toISOString() }).eq("id", input.contactId);
    return true;
  } catch {
    return false;
  }
}

/** Tarefas do consultor (por prazo). */
export async function listTasksByOwner(ownerId: string): Promise<Task[]> {
  if (!isSupabaseConfigured()) return demoTasksByOwner(ownerId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", ownerId)
      .order("due_at", { ascending: true });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      ownerId: String(r.owner_id ?? ownerId),
      contactId: (r.contact_id as string) ?? undefined,
      title: String(r.title ?? ""),
      kind: (r.kind as Task["kind"]) ?? "other",
      priority: (r.priority as Task["priority"]) ?? "normal",
      dueAt: (r.due_at as string) ?? undefined,
      done: Boolean(r.done),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return demoTasksByOwner(ownerId);
  }
}

/** Cria uma tarefa (dual). */
export async function createTask(input: {
  ownerId: string;
  title: string;
  kind: Task["kind"];
  priority?: Task["priority"];
  contactId?: string;
  contactName?: string;
  dueAt?: string;
}): Promise<Task> {
  const task: Task = {
    id: `tk-${Date.now()}`,
    priority: input.priority ?? "normal",
    done: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (!isSupabaseConfigured()) return task;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tasks")
      .insert({
        owner_id: input.ownerId,
        contact_id: input.contactId ?? null,
        title: input.title,
        kind: input.kind,
        priority: input.priority ?? "normal",
        due_at: input.dueAt ?? null,
      })
      .select("id")
      .single();
    return { ...task, id: data ? String(data.id) : task.id };
  } catch {
    return task;
  }
}

/** Marca/desmarca uma tarefa como feita (best-effort). */
export async function setTaskDone(id: string, done: boolean): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const supabase = await createClient();
    await supabase.from("tasks").update({ done }).eq("id", id);
    return true;
  } catch {
    return false;
  }
}

/** Agenda do consultor (visitas/eventos, por data). */
export async function listVisitsByOwner(ownerId: string): Promise<Visit[]> {
  if (!isSupabaseConfigured()) return demoVisitsByOwner(ownerId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visits")
      .select("*")
      .eq("owner_id", ownerId)
      .order("at", { ascending: true });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      ownerId: String(r.owner_id ?? ownerId),
      contactId: (r.contact_id as string) ?? undefined,
      propertyId: (r.property_id as string) ?? undefined,
      propertyRef: (r.property_ref as string) ?? undefined,
      kind: (r.kind as Visit["kind"]) ?? "visita",
      at: String(r.at ?? new Date().toISOString()),
      durationMin: r.duration_min != null ? Number(r.duration_min) : undefined,
      status: (r.status as Visit["status"]) ?? "agendada",
      note: (r.note as string) ?? undefined,
    }));
  } catch {
    return demoVisitsByOwner(ownerId);
  }
}

/** Cria uma visita/evento na agenda (dual). */
export async function createVisit(input: {
  ownerId: string;
  contactId?: string;
  contactName?: string;
  propertyId?: string;
  propertyRef?: string;
  kind: Visit["kind"];
  at: string;
  durationMin?: number;
  note?: string;
}): Promise<Visit> {
  const visit: Visit = {
    id: `vs-${Date.now()}`,
    status: "agendada",
    ...input,
  };
  if (!isSupabaseConfigured()) return visit;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visits")
      .insert({
        owner_id: input.ownerId,
        contact_id: input.contactId ?? null,
        property_id: input.propertyId ?? null,
        property_ref: input.propertyRef ?? null,
        kind: input.kind,
        at: input.at,
        duration_min: input.durationMin ?? null,
        note: input.note ?? null,
      })
      .select("id")
      .single();
    return { ...visit, id: data ? String(data.id) : visit.id };
  } catch {
    return visit;
  }
}

// --- X Call (chamadas assistidas, F3) --------------------------------------

import {
  callLogsByAgent as demoCallLogsByAgent,
  stageNameForResult,
  type CallLog,
} from "@/lib/data/xcall";

/** Chamadas do consultor (mais recente primeiro). */
export async function listCallLogs(agentId: string): Promise<CallLog[]> {
  if (!isSupabaseConfigured()) return demoCallLogsByAgent(agentId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("call_logs")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      agentId: String(r.agent_id ?? agentId),
      contactId: (r.contact_id as string) ?? undefined,
      leadId: (r.lead_id as string) ?? undefined,
      scriptKey: (r.script_key as CallLog["scriptKey"]) ?? "comprador",
      objective: (r.objective as string) ?? undefined,
      result: (r.result as CallLog["result"]) ?? "outro",
      temperature: (r.temperature as CallLog["temperature"]) ?? undefined,
      score: r.score != null ? Number(r.score) : undefined,
      notes: (r.notes as string) ?? undefined,
      nextTaskTitle: (r.next_task_title as string) ?? undefined,
      nextTaskDueAt: (r.next_task_due_at as string) ?? undefined,
      lostReason: (r.lost_reason as string) ?? undefined,
      durationSec: r.duration_sec != null ? Number(r.duration_sec) : undefined,
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return demoCallLogsByAgent(agentId);
  }
}

/**
 * Regista uma chamada e propaga: cronologia do contacto, próxima tarefa e
 * atualização da lead (estado/qualificação). Em demo devolve o objeto sem
 * persistir. É o "depois da chamada" do X Call.
 */
export async function logCall(input: {
  agentId: string;
  agentName?: string;
  contactId?: string;
  contactName?: string;
  leadId?: string;
  scriptKey: CallLog["scriptKey"];
  objective?: string;
  result: CallLog["result"];
  temperature?: CallLog["temperature"];
  score?: number;
  notes?: string;
  nextTaskTitle?: string;
  nextTaskDueAt?: string;
  lostReason?: string;
}): Promise<CallLog> {
  const log: CallLog = {
    id: `cl-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (!isSupabaseConfigured()) return log;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("call_logs")
      .insert({
        agent_id: input.agentId,
        contact_id: input.contactId ?? null,
        lead_id: input.leadId ?? null,
        script_key: input.scriptKey,
        objective: input.objective ?? null,
        result: input.result,
        temperature: input.temperature ?? null,
        score: input.score ?? null,
        notes: input.notes ?? null,
        next_task_title: input.nextTaskTitle ?? null,
        next_task_due_at: input.nextTaskDueAt ?? null,
        lost_reason: input.lostReason ?? null,
      })
      .select("id")
      .single();
    const id = data ? String(data.id) : log.id;

    // Cronologia do contacto.
    if (input.contactId) {
      await addContactActivity({
        contactId: input.contactId,
        type: "call",
        title: `Chamada — ${input.result}`,
        body: input.notes,
        direction: "out",
        actorId: input.agentId,
        actorName: input.agentName,
        leadId: input.leadId,
      });
    }
    // Próxima tarefa.
    if (input.nextTaskTitle) {
      await createTask({
        ownerId: input.agentId,
        title: input.nextTaskTitle,
        kind: "followup",
        contactId: input.contactId,
        contactName: input.contactName,
        dueAt: input.nextTaskDueAt,
      });
    }
    // Atualização da lead (estado/qualificação) conforme o resultado.
    if (input.leadId) {
      const patch: Record<string, unknown> = {};
      if (stageNameForResult(input.result)) patch.status = "contactado";
      if (input.result === "qualificada") patch.qualification = "qualificado";
      if (input.result === "sem_interesse") {
        patch.qualification = "desqualificado";
        patch.status = "perdido";
      }
      if (Object.keys(patch).length) {
        await supabase.from("leads").update(patch).eq("id", input.leadId);
      }
    }
    return { ...log, id };
  } catch {
    return log;
  }
}

// --- X Campaigns (email marketing, F4) -------------------------------------

import {
  emailCampaignsByOwner as demoEmailCampaignsByOwner,
  type EmailCampaign,
  type EmailStats,
} from "@/lib/data/xcampaigns";

function mapEmailCampaign(r: Row): EmailCampaign {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as EmailCampaign["type"]) ?? "campanha",
    subject: String(r.subject ?? ""),
    preheader: (r.preheader as string) ?? undefined,
    blocks: Array.isArray(r.blocks) ? (r.blocks as EmailCampaign["blocks"]) : [],
    segment: (r.segment as EmailCampaign["segment"]) ?? {},
    status: (r.status as EmailCampaign["status"]) ?? "rascunho",
    scheduleAt: (r.schedule_at as string) ?? undefined,
    ownerId: String(r.owner_id ?? ""),
    stats: (r.stats as EmailStats) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

/** Campanhas de email do consultor. */
export async function listEmailCampaigns(ownerId: string): Promise<EmailCampaign[]> {
  if (!isSupabaseConfigured()) return demoEmailCampaignsByOwner(ownerId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapEmailCampaign);
  } catch {
    return demoEmailCampaignsByOwner(ownerId);
  }
}

/** Cria uma campanha de email (dual). */
export async function createEmailCampaign(input: {
  ownerId: string;
  name: string;
  type: EmailCampaign["type"];
  subject: string;
  blocks: EmailCampaign["blocks"];
  segment: EmailCampaign["segment"];
  scheduleAt?: string;
}): Promise<EmailCampaign> {
  const campaign: EmailCampaign = {
    id: `ec-${Date.now()}`,
    status: input.scheduleAt ? "agendada" : "rascunho",
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (!isSupabaseConfigured()) return campaign;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("email_campaigns")
      .insert({
        owner_id: input.ownerId,
        name: input.name,
        type: input.type,
        subject: input.subject,
        blocks: input.blocks,
        segment: input.segment,
        status: campaign.status,
        schedule_at: input.scheduleAt ?? null,
      })
      .select("id")
      .single();
    return { ...campaign, id: data ? String(data.id) : campaign.id };
  } catch {
    return campaign;
  }
}

/** Emails suprimidos (unsubscribe/devoluções) — nunca receber. */
export async function listSuppressions(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("email_suppressions").select("email");
    return (data ?? []).map((r: Row) => String(r.email ?? "").toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Regista o resultado de um envio SANDBOX: guarda as estatísticas, marca a
 * campanha e escreve o email na cronologia dos destinatários. NÃO envia emails
 * reais. Em demo devolve ok.
 */
export async function recordSandboxSend(input: {
  campaignId: string;
  subject: string;
  recipients: { contactId?: string; email?: string; name?: string }[];
  stats: EmailStats;
  actorId?: string;
  actorName?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const supabase = await createClient();
    await supabase
      .from("email_campaigns")
      .update({ status: "sandbox", stats: input.stats })
      .eq("id", input.campaignId);
    if (input.recipients.length) {
      await supabase.from("email_sends").insert(
        input.recipients.map((r) => ({
          campaign_id: input.campaignId,
          contact_id: r.contactId ?? null,
          email: r.email ?? null,
          status: "sandbox",
          sandbox: true,
        }))
      );
      // Cronologia de cada contacto conhecido.
      for (const r of input.recipients) {
        if (r.contactId) {
          await addContactActivity({
            contactId: r.contactId,
            type: "email",
            title: `Email (sandbox): ${input.subject}`,
            direction: "out",
            actorId: input.actorId,
            actorName: input.actorName,
          });
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

// --- X Market (marketplace, carteira, créditos, F5) ------------------------

import {
  demoProducts,
  demoWallet,
  ordersByBuyer as demoOrdersByBuyer,
  orderTotal,
  needsApproval,
  type Product,
  type Wallet,
  type Order,
  type OrderItem,
} from "@/lib/data/xmarket";

/** Catálogo de produtos/serviços. */
export async function listProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return demoProducts;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("*").eq("active", true).order("category");
    if (!data || data.length === 0) return demoProducts;
    return data.map((r: Row) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      category: (r.category as Product["category"]) ?? "outros",
      price: Number(r.price ?? 0),
      unit: (r.unit as string) ?? undefined,
      supplier: (r.supplier as string) ?? undefined,
      creditType: (r.credit_type as Product["creditType"]) ?? undefined,
      creditAmount: r.credit_amount != null ? Number(r.credit_amount) : undefined,
      stock: r.stock != null ? Number(r.stock) : undefined,
      description: (r.description as string) ?? undefined,
    }));
  } catch {
    return demoProducts;
  }
}

/** Carteira do consultor (saldo + créditos). */
export async function getWallet(ownerId: string, ownerName?: string): Promise<Wallet> {
  if (!isSupabaseConfigured()) return demoWallet(ownerId, ownerName);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("wallets")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("scope", "agent")
      .maybeSingle();
    if (!data) return demoWallet(ownerId, ownerName);
    return {
      id: String(data.id),
      scope: (data.scope as Wallet["scope"]) ?? "agent",
      ownerId: String(data.owner_id ?? ownerId),
      ownerName,
      balance: Number(data.balance ?? 0),
      monthlyBudget: data.monthly_budget != null ? Number(data.monthly_budget) : undefined,
      monthlySpent: Number(data.monthly_spent ?? 0),
      approvalThreshold: data.approval_threshold != null ? Number(data.approval_threshold) : undefined,
      blockWhenEmpty: Boolean(data.block_when_empty),
      credits: Array.isArray(data.credits) ? (data.credits as Wallet["credits"]) : [],
    };
  } catch {
    return demoWallet(ownerId, ownerName);
  }
}

/** Encomendas do comprador. */
export async function listOrders(buyerId: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) return demoOrdersByBuyer(buyerId);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      buyerId: String(r.buyer_id ?? buyerId),
      total: Number(r.total ?? 0),
      status: (r.status as Order["status"]) ?? "pendente_aprovacao",
      createdAt: String(r.created_at ?? new Date().toISOString()),
      items: Array.isArray(r.order_items)
        ? (r.order_items as Row[]).map((i) => ({
            productId: String(i.product_id ?? ""),
            name: String(i.name ?? ""),
            qty: Number(i.qty ?? 1),
            unitPrice: Number(i.unit_price ?? 0),
          }))
        : [],
    }));
  } catch {
    return demoOrdersByBuyer(buyerId);
  }
}

/**
 * Cria uma encomenda. Aplica a regra de aprovação (acima do limite da carteira
 * → "pendente_aprovacao"), senão debita a carteira e marca "paga". Regista no
 * livro-razão. Em demo devolve o objeto sem persistir.
 */
export async function createOrder(input: {
  buyerId: string;
  buyerName?: string;
  items: OrderItem[];
}): Promise<Order> {
  const total = orderTotal(input.items);
  const wallet = await getWallet(input.buyerId, input.buyerName);
  const requiresApproval = needsApproval(total, wallet.approvalThreshold);
  const status: Order["status"] = requiresApproval ? "pendente_aprovacao" : "paga";

  const order: Order = {
    id: `o-${Date.now()}`,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    items: input.items,
    total,
    status,
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured()) return order;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .insert({ buyer_id: input.buyerId, total, status })
      .select("id")
      .single();
    const id = data ? String(data.id) : order.id;
    if (input.items.length) {
      await supabase.from("order_items").insert(
        input.items.map((i) => ({
          order_id: id,
          product_id: i.productId || null,
          name: i.name,
          qty: i.qty,
          unit_price: i.unitPrice,
        }))
      );
    }
    // Debita a carteira só quando não precisa de aprovação.
    if (!requiresApproval) {
      await supabase
        .from("wallets")
        .update({ balance: wallet.balance - total, monthly_spent: wallet.monthlySpent + total })
        .eq("id", wallet.id);
      await supabase.from("wallet_ledger").insert({
        wallet_id: wallet.id,
        kind: "encomenda",
        amount: total,
        note: input.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
      });
    }
    return { ...order, id };
  } catch {
    return order;
  }
}

/** Atividade/linha do tempo de uma lead. */
export async function listLeadActivity(leadId: string): Promise<LeadActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      leadId: String(r.lead_id ?? leadId),
      type: (r.type as LeadActivity["type"]) ?? "note",
      actorId: (r.actor_id as string) ?? undefined,
      actorName: (r.actor_name as string) ?? undefined,
      note: (r.note as string) ?? undefined,
      from: (r.from_val as string) ?? undefined,
      to: (r.to_val as string) ?? undefined,
      at: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}
