import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPropertyById } from "@/lib/db/repo";
import { auditFieldLabel, type AuditChange, type AuditEntry } from "@/lib/data/audit";
import { isStaff } from "@/lib/data/roles";
import { formatEuro } from "@/lib/format";

/** Campos editáveis e como se mapeiam para a coluna do Supabase.
 *  Cobrem o mesmo conjunto que o carregamento (paridade edição↔carregamento). */
const FIELDS: Record<string, string> = {
  title: "title",
  operation: "operation",
  businessType: "business_type",
  type: "type",
  priceVisible: "price_visible",
  locationPrivacy: "location_privacy",
  typology: "typology",
  price: "price",
  area: "area",
  beds: "beds",
  baths: "baths",
  parish: "parish",
  municipality: "municipality",
  district: "district",
  energy: "energy",
  status: "status",
  shortDescription: "short_description",
  description: "description",
  commissionType: "commission_type",
  commissionPct: "commission_pct",
  commissionFixed: "commission_fixed",
  sellerType: "seller_type",
  videoUrl: "video_url",
  tourUrl: "tour_url",
  constructionYear: "construction_year",
  elevator: "elevator",
  isDevelopment: "is_development",
  developmentName: "development_name",
  developmentStage: "development_stage",
  developmentUnits: "development_units",
  cmiExclusive: "cmi_exclusive",
  cmiRenewable: "cmi_renewable",
  cmiStart: "cmi_start",
  cmiMonths: "cmi_months",
  energyCertExpiry: "energy_cert_expiry",
  developmentTypologies: "development_typologies",
  developmentPriceFrom: "development_price_from",
  developmentDelivery: "development_delivery",
  ownerName: "owner_name",
  ownerPhone: "owner_phone",
  ownerEmail: "owner_email",
  ownerNif: "owner_nif",
  hasPlaca: "has_placa",
  hasKeys: "has_keys",
};

const NUMERIC = new Set([
  "price", "beds", "baths", "area", "commissionPct", "commissionFixed",
  "constructionYear", "developmentUnits", "cmiMonths", "developmentPriceFrom",
]);
const BOOLEAN = new Set([
  "elevator", "isDevelopment", "priceVisible", "cmiExclusive", "cmiRenewable",
  "hasPlaca", "hasKeys",
]);

function fmt(field: string, v: unknown): string {
  if (BOOLEAN.has(field)) return v ? "Sim" : "Não";
  if (v == null || v === "") return "—";
  if (field === "price" || field === "commissionFixed") return formatEuro(Number(v));
  return String(v);
}

/**
 * Edição de imóvel por quem tem permissão (dono, coordenação/direção, admin ou
 * super admin — que pode editar QUALQUER imóvel). Regista no histórico de
 * rastreio quem alterou o quê e quando.
 *
 * POST { id, patch: { campo: valor } }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { id?: string; patch?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  const patch = body.patch ?? {};
  if (!id) return NextResponse.json({ error: "id_missing" }, { status: 400 });

  const current = await getPropertyById(id);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Permissão: dono, co-angariador, ou staff (coordenação/direção/admin/superadmin).
  const a = session.agent;
  const owner = current.agentId === a.id || (current.coAgentIds ?? []).includes(a.id);
  if (!owner && !isStaff(a)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  // Diferenças (para o histórico).
  const changes: AuditChange[] = [];
  const dbPatch: Record<string, unknown> = {};
  for (const [field, col] of Object.entries(FIELDS)) {
    if (!(field in patch)) continue;
    let value: unknown = patch[field];
    if (NUMERIC.has(field)) value = value === "" || value == null ? null : Number(value);
    else if (BOOLEAN.has(field)) value = Boolean(value);
    const before = (current as unknown as Record<string, unknown>)[field];
    const same = String(before ?? "") === String(value ?? "");
    if (same) continue;
    changes.push({ field: auditFieldLabel(field), from: fmt(field, before), to: fmt(field, value) });
    dbPatch[col] = value;
  }

  // Coordenadas — atualizadas em silêncio (sem linha de histórico ruidosa).
  if ("lat" in patch && patch.lat != null) dbPatch.latitude = Number(patch.lat);
  if ("lng" in patch && patch.lng != null) dbPatch.longitude = Number(patch.lng);

  // Media (arrays) — só regista alteração quando o conteúdo muda de facto.
  if ("gallery" in patch && Array.isArray(patch.gallery)) {
    const next = patch.gallery as string[];
    if (JSON.stringify(current.gallery ?? []) !== JSON.stringify(next)) {
      dbPatch.gallery = next.length ? next : null;
      changes.push({ field: "Fotografias", from: `${current.gallery?.length ?? 0}`, to: `${next.length}` });
    }
  }
  if ("galleryMeta" in patch && Array.isArray(patch.galleryMeta)) {
    dbPatch.gallery_meta = patch.galleryMeta.length ? patch.galleryMeta : null;
  }
  if ("expenses" in patch && Array.isArray(patch.expenses)) {
    if (JSON.stringify(current.expenses ?? []) !== JSON.stringify(patch.expenses)) {
      dbPatch.expenses = patch.expenses.length ? patch.expenses : null;
      changes.push({ field: "Encargos", from: `${current.expenses?.length ?? 0}`, to: `${patch.expenses.length}` });
    }
  }
  if ("tags" in patch && Array.isArray(patch.tags)) {
    const next = patch.tags as string[];
    if (JSON.stringify(current.tags ?? []) !== JSON.stringify(next)) {
      dbPatch.tags = next.length ? next : null;
      changes.push({ field: "Etiquetas", from: (current.tags ?? []).join(", ") || "—", to: next.join(", ") || "—" });
    }
  }
  if ("coverUrl" in patch) {
    const cover = patch.coverUrl ? String(patch.coverUrl) : "";
    if ((current.image ?? "") !== cover) dbPatch.cover_url = cover || null;
  }
  if ("beforeAfter" in patch && Array.isArray(patch.beforeAfter)) {
    const next = patch.beforeAfter;
    if (JSON.stringify(current.beforeAfter ?? []) !== JSON.stringify(next)) {
      dbPatch.before_after = next.length ? next : null;
      changes.push({ field: "Antes/depois", from: `${current.beforeAfter?.length ?? 0}`, to: `${next.length}` });
    }
  }

  if (changes.length === 0 && Object.keys(dbPatch).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  // Só se regista no histórico quando há alterações "visíveis" (as coordenadas
  // atualizam-se em silêncio).
  const entry: AuditEntry | null = changes.length
    ? {
        id: `au-${Date.now()}`,
        propertyId: id,
        propertyRef: current.reference,
        actorId: a.id,
        actorName: a.name,
        actorRole: a.role,
        action: "editou",
        changes,
        at: new Date().toISOString(),
      }
    : null;

  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      if (Object.keys(dbPatch).length) {
        await supabase.from("properties").update(dbPatch).eq("id", id);
      }
      if (entry) {
        await supabase.from("property_audit").insert({
          property_id: id,
          property_ref: current.reference,
          actor_id: a.id,
          actor_name: a.name,
          actor_role: a.role,
          action: "editou",
          changes,
        });
      }
    } catch {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }

  // Devolve a entrada de histórico (o cliente mostra-a mesmo em demo).
  return NextResponse.json({ ok: true, entry, demo: session.demo });
}
