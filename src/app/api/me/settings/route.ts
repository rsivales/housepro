import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Preferências de personalização do utilizador autenticado (Helix): banner
 * pessoal, widgets do dashboard, etc. Guardadas em profiles.settings (JSONB),
 * protegidas pela RLS "profiles update self". Em modo demo (sem Supabase)
 * responde persisted:false — o cliente mantém o localStorage como fallback.
 */

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ settings: null, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ settings: null, persisted: false });

  try {
    const sb = await createClient();
    const { data } = await sb.from("profiles").select("settings").eq("id", session.agent.id).single();
    return NextResponse.json({ settings: data?.settings ?? {}, persisted: true });
  } catch {
    return NextResponse.json({ settings: null, persisted: false });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ ok: false, persisted: false }, { status: 401 });

  let body: { patch?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const patch = body.patch;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "missing_patch" }, { status: 400 });
  }

  try {
    const sb = await createClient();
    // Lê o atual e mescla (merge superficial por chave) para não perder outras
    // preferências. A RLS garante que só o próprio perfil é lido/escrito.
    const { data: current } = await sb.from("profiles").select("settings").eq("id", session.agent.id).single();
    const merged = { ...(current?.settings ?? {}), ...patch };
    const { error } = await sb.from("profiles").update({ settings: merged }).eq("id", session.agent.id);
    if (error) return NextResponse.json({ ok: false, persisted: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, persisted: true, settings: merged });
  } catch {
    return NextResponse.json({ ok: false, persisted: false }, { status: 500 });
  }
}
