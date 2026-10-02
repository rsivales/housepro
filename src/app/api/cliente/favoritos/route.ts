import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Favoritos do comprador autenticado (portal público). Usa o cliente com a
 * sessão do visitante — a RLS de buyer_favorites garante o isolamento por
 * utilizador. Sem sessão/Supabase → 401 (o cliente usa localStorage).
 */
async function requireBuyer() {
  if (!isSupabaseConfigured()) return null;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  return { sb, userId: user.id };
}

export async function GET() {
  const ctx = await requireBuyer();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data, error } = await ctx.sb.from("buyer_favorites").select("property_id").eq("user_id", ctx.userId);
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });
  return NextResponse.json({ ids: (data ?? []).map((r) => String(r.property_id)) });
}

export async function POST(request: Request) {
  const ctx = await requireBuyer();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { propertyId?: string; ids?: string[] };

  // Aceita um id único ou uma lista (migração dos favoritos locais ao entrar).
  const ids = Array.isArray(body.ids) ? body.ids : body.propertyId ? [body.propertyId] : [];
  const rows = ids.filter((id) => typeof id === "string" && id.trim()).map((id) => ({ user_id: ctx.userId, property_id: String(id) }));
  if (rows.length === 0) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { error } = await ctx.sb.from("buyer_favorites").upsert(rows, { onConflict: "user_id,property_id" });
  if (error) return NextResponse.json({ error: "write_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await requireBuyer();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const propertyId = new URL(request.url).searchParams.get("propertyId") ?? "";
  if (!propertyId) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const { error } = await ctx.sb.from("buyer_favorites").delete().eq("user_id", ctx.userId).eq("property_id", propertyId);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
