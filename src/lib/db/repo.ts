import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  availableProperties,
  propertiesByAgent as mockByAgent,
  propertyById as mockById,
} from "@/lib/data/mock";
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
    .order("listed_at", { ascending: false });
  return (data ?? []).map(mapRow);
}
