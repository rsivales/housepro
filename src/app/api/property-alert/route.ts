import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const kind = body.kind === "personalized" ? "personalized" : "alert";
  const name = String(body.name ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !body.consent || (kind === "personalized" && !name)) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  const criteria = body.criteria && typeof body.criteria === "object" ? body.criteria : {};
  const admin = createAdminClient();
  const subSource = kind === "personalized" ? "Imóveis — Pesquisa personalizada" : "Imóveis — Alerta de pesquisa";
  const message = JSON.stringify({ criteria, details: String(body.details ?? ""), contactPreference: String(body.contactPreference ?? ""), operationalConsent: true });
  const base = { owner_id: null, name: kind === "personalized" ? name : "Alerta de pesquisa", contact: phone || email, message, source: "site", status: "novo" };
  const payload = { ...base, email, intent: "mensagem", sub_source: subSource, page_url: String(body.pageUrl ?? ""), referrer_url: String(body.referrerUrl ?? ""), utm: body.utm ?? {}, marketing_consent: Boolean(body.marketingConsent) };
  const { data: matches } = await admin.from("leads").select("id").eq("email", email).eq("sub_source", subSource).order("created_at", { ascending: false }).limit(1);
  const existing = matches?.[0];
  let result = existing ? await admin.from("leads").update(payload).eq("id", existing.id).select("id").single() : await admin.from("leads").insert(payload).select("id").single();
  // Compatibilidade com instalações Helix cujo cache da API ainda não conhece
  // todos os campos de funil: o pedido essencial nunca se perde.
  if (result.error) result = existing ? await admin.from("leads").update(base).eq("id", existing.id).select("id").single() : await admin.from("leads").insert(base).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  const data = result.data;
  return NextResponse.json({ ok: true, id: data.id, updated: Boolean(existing) });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.id ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!id || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  const admin = createAdminClient();
  const { error } = await admin.from("leads").update({ status: "perdido", message: JSON.stringify({ alertCancelled: true, cancelledAt: new Date().toISOString() }) }).eq("id", id).eq("email", email).eq("sub_source", "Imóveis — Alerta de pesquisa");
  if (error) return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
