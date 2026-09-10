import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !body.consent) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  const criteria = body.criteria && typeof body.criteria === "object" ? body.criteria : {};
  const admin = createAdminClient();
  const payload = { owner_id: null, name: "Alerta de pesquisa", contact: phone || email, email, intent: "mensagem", source: "site", status: "novo", sub_source: "Imóveis — Alerta de pesquisa", message: JSON.stringify({ criteria, operationalConsent: true }), page_url: String(body.pageUrl ?? ""), referrer_url: String(body.referrerUrl ?? ""), utm: body.utm ?? {}, marketing_consent: Boolean(body.marketingConsent) };
  const { data: existing } = await admin.from("leads").select("id").eq("email", email).eq("sub_source", "Imóveis — Alerta de pesquisa").maybeSingle();
  const query = existing ? admin.from("leads").update(payload).eq("id", existing.id) : admin.from("leads").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
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
