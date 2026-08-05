import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPropertyById } from "@/lib/db/repo";
import { auditFieldLabel, type AuditChange, type AuditEntry } from "@/lib/data/audit";
import { isStaff } from "@/lib/data/roles";
import { formatEuro } from "@/lib/format";

/** Campos editáveis e como se mapeiam para a coluna do Supabase. */
const FIELDS: Record<string, string> = {
  title: "title",
  price: "price",
  typology: "typology",
  beds: "beds",
  baths: "baths",
  area: "area",
  status: "status",
  shortDescription: "short_description",
  description: "description",
  commissionPct: "commission_pct",
  commissionFixed: "commission_fixed",
};

const NUMERIC = new Set(["price", "beds", "baths", "area", "commissionPct", "commissionFixed"]);

function fmt(field: string, v: unknown): string {
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
    const before = (current as unknown as Record<string, unknown>)[field];
    const same = String(before ?? "") === String(value ?? "");
    if (same) continue;
    changes.push({ field: auditFieldLabel(field), from: fmt(field, before), to: fmt(field, value) });
    dbPatch[col] = value;
  }

  if (changes.length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const entry: AuditEntry = {
    id: `au-${Date.now()}`,
    propertyId: id,
    propertyRef: current.reference,
    actorId: a.id,
    actorName: a.name,
    actorRole: a.role,
    action: "editou",
    changes,
    at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      await supabase.from("properties").update(dbPatch).eq("id", id);
      await supabase.from("property_audit").insert({
        property_id: id,
        property_ref: current.reference,
        actor_id: a.id,
        actor_name: a.name,
        actor_role: a.role,
        action: "editou",
        changes,
      });
    } catch {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }

  // Devolve a entrada de histórico (o cliente mostra-a mesmo em demo).
  return NextResponse.json({ ok: true, entry, demo: session.demo });
}
