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
import type { Property } from "@/lib/data/types";

/**
 * Data-access layer. Reads from Supabase when configured, otherwise falls back
 * to the in-memory mock — so the app runs everywhere and pages migrate to the
 * database transparently as the rest of M2 lands.
 */

type Row = Record<string, unknown>;

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
    energy: (r.energy as Property["energy"]) ?? "C",
    status: (r.status as Property["status"]) ?? null,
    image: String(r.cover_url ?? ""),
    gallery: Array.isArray(r.gallery) && r.gallery.length ? (r.gallery as string[]) : undefined,
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
    .select("*")
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
    .select("*")
    .eq("id", id)
    .single();
  return data ? mapRow(data) : null;
}

export async function listProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured()) return availableProperties;

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
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
    .select("*, profiles!inner(agency_id)")
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
    .select("*, profiles!inner(agency_id)")
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
    .select("*")
    .neq("id", property.id)
    .neq("status", "vendido")
    .eq("approval", "aprovado")
    .eq("municipality", property.municipality)
    .limit(limit);
  return (data ?? []).map(mapRow);
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
