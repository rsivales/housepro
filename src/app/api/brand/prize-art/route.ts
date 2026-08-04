import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PrizeArtMap } from "@/lib/data/prize-art";

/**
 * Artes dos prémios (troféus) partilhadas por todos: guardadas em site_settings
 * (chave "prizeArt") como { nomeDoPrémio: urlDaImagem }. As imagens ficam no
 * Storage; aqui guarda-se apenas o mapa nome→URL.
 *
 *  GET  → mapa atual (público — a área do consultor e a montra usam-no).
 *  POST → grava o mapa (só administração).
 */

const KEY = "prizeArt";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ art: {} });
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    return NextResponse.json({ art: (data?.value as PrizeArtMap) ?? {} });
  } catch {
    return NextResponse.json({ art: {} });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const isAdmin = session.agent.role === "admin" || session.agent.roleKey === "admin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Apenas a administração pode definir as artes." }, { status: 403 });
  }

  let body: { art?: PrizeArtMap };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const art = body.art && typeof body.art === "object" ? body.art : {};

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: KEY, value: art, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
