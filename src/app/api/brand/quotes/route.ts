import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can } from "@/lib/data/permissions";
import type { DailyQuote } from "@/lib/data/quotes";

/**
 * Frases diárias — campanhas/datas especiais geridas centralmente (site_settings
 * chave "quotes"). GET devolve as frases extra; POST grava (administração).
 */
const KEY = "quotes";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ extra: [] });
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value as { extra?: DailyQuote[] }) ?? {};
    return NextResponse.json({ extra: Array.isArray(v.extra) ? v.extra : [] });
  } catch {
    return NextResponse.json({ extra: [] });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const isAdmin =
    session.agent.roleKey === "admin" ||
    session.agent.roleKey === "superadmin" ||
    session.agent.role === "admin" ||
    can(session.agent.roleKey, "manage_permissions");
  if (!session.demo && !isAdmin) {
    return NextResponse.json({ error: "Apenas a administração pode gerir frases." }, { status: 403 });
  }

  let body: { extra?: DailyQuote[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const extra = (Array.isArray(body.extra) ? body.extra : [])
    .filter((q) => q && typeof q.text === "string" && q.text.trim())
    .map((q) => ({ text: q.text.trim(), date: q.date || undefined, tag: q.tag }));

  if (session.demo) return NextResponse.json({ ok: true, demo: true, extra });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert({ key: KEY, value: { extra } }, { onConflict: "key" });
    if (error) throw error;
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, extra });
}
