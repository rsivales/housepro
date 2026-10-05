import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSignatureCollection } from "@/lib/signature/collections";
import { isBrandAdmin } from "@/lib/data/roles";

const allowed = new Set([
  "is_signature", "signature_status", "signature_order", "signature_hero_url",
  "signature_editorial_title", "signature_editorial_intro", "signature_attributes",
  "signature_collection", "signature_visibility", "signature_price_visible", "signature_featured",
]);

const SELECT_COLS =
  "id, reference, title, municipality, is_signature, signature_status, signature_order, signature_editorial_title, signature_collection, signature_visibility, signature_price_visible, signature_featured";

/** Gestão exclusivamente server-side da seleção Signature.
 *  Candidaturas (submetidas pelos consultores ou já na coleção) vêm sempre
 *  primeiro — para quem aprova não ter de procurar entre os imóveis recentes. */
export async function GET() {
  const session = await getSession();
  if (!session || !isBrandAdmin(session.agent)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const db = createAdminClient();
  const [{ data: nominated, error: e1 }, { data: recent, error: e2 }] = await Promise.all([
    db.from("properties").select(SELECT_COLS).eq("is_signature", true).order("listed_at", { ascending: false }),
    db.from("properties").select(SELECT_COLS).order("listed_at", { ascending: false }).limit(100),
  ]);
  if (e1 || e2) {
    console.error("[signature/manage GET]", e1 ?? e2);
    return NextResponse.json({ error: "read_failed", detail: (e1 ?? e2)?.message }, { status: 500 });
  }
  const nominatedIds = new Set((nominated ?? []).map((p) => p.id));
  const rest = (recent ?? []).filter((p) => !nominatedIds.has(p.id));
  return NextResponse.json({ properties: [...(nominated ?? []), ...rest] });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !isBrandAdmin(session.agent)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null;
  if (!body?.id || !body.patch) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const patch = Object.fromEntries(Object.entries(body.patch).filter(([key]) => allowed.has(key)));
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_changes" }, { status: 400 });
  if ("signature_collection" in patch) {
    const value = patch.signature_collection;
    if (value === null || value === "") patch.signature_collection = null;
    else if (typeof value === "string" && getSignatureCollection(value)) patch.signature_collection = getSignatureCollection(value)!.slug;
    else return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }
  if (patch.signature_status === "approved") {
    patch.is_signature = true;
    patch.signature_approved_by = session.agent.id;
    patch.signature_approved_at = new Date().toISOString();
    patch.signature_published_at ??= new Date().toISOString();
  }
  const db = createAdminClient();
  const { data: property, error } = await db.from("properties").update(patch).eq("id", body.id).select("id, reference").single();
  if (error || !property) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  await db.from("property_audit").insert({
    property_id: property.id, property_ref: property.reference, actor_id: session.agent.id,
    actor_name: session.agent.name, actor_role: session.agent.role,
    action: "signature", changes: Object.keys(patch).map((field) => ({ field, to: patch[field] })),
  });
  return NextResponse.json({ ok: true });
}
