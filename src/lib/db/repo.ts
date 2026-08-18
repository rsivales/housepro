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
      zoneMap: (r.zone_map as Record<string, string>) ?? undefined,
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
