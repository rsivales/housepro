import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * O próprio consultor propõe alterações ao seu perfil (nome, foto, WhatsApp).
 * Não grava direto em `profiles` — cria/atualiza um pedido pendente que a
 * coordenação/administração aprova em /admin/aprovacoes. RLS garante que só
 * consegue tocar nos seus próprios pedidos (ver migration_profile_change_requests.sql).
 *
 * POST { name?, photoUrl?, whatsapp? }        → cria ou atualiza o pedido pendente.
 * POST { cancel: true }                       → cancela o pedido pendente atual.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  let body: { name?: string; photoUrl?: string; whatsapp?: string; cancel?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: existingErr } = await supabase
    .from("profile_change_requests")
    .select("id")
    .eq("profile_id", session.agent.id)
    .eq("status", "pendente")
    .maybeSingle();
  // Tabela ainda não criada (migração pendente) — code 42P01 = undefined_table.
  if (existingErr && existingErr.code === "42P01") {
    console.error("[profile/change-request] tabela profile_change_requests não existe — falta correr a migração", existingErr);
    return NextResponse.json({ error: "table_missing" }, { status: 500 });
  }

  if (body.cancel) {
    if (!existing) return NextResponse.json({ ok: true });
    const { error } = await supabase
      .from("profile_change_requests")
      .update({ status: "cancelado" })
      .eq("id", existing.id);
    if (error) {
      console.error("[profile/change-request] falha ao cancelar", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim() || null;
  const photoUrl = body.photoUrl?.trim() || null;
  const whatsapp = body.whatsapp?.trim() || null;
  if (!name && !photoUrl && !whatsapp) {
    return NextResponse.json({ error: "empty_request" }, { status: 422 });
  }

  if (existing) {
    const { error } = await supabase
      .from("profile_change_requests")
      .update({ name, photo_url: photoUrl, whatsapp, status: "pendente" })
      .eq("id", existing.id);
    if (error) {
      console.error("[profile/change-request] falha ao atualizar pedido", error);
      return NextResponse.json({ error: error.code === "42P01" ? "table_missing" : error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const { data: created, error } = await supabase
    .from("profile_change_requests")
    .insert({ profile_id: session.agent.id, name, photo_url: photoUrl, whatsapp })
    .select("id")
    .single();
  if (error) {
    console.error("[profile/change-request] falha ao criar pedido", error);
    return NextResponse.json({ error: error.code === "42P01" ? "table_missing" : error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: created?.id });
}
