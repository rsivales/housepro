import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isStaff } from "@/lib/data/roles";

/**
 * Conteúdos geríveis da homepage pública — banners, histórias reais, vagas e
 * imagens de artigos. Guardados em site_settings (uma chave por secção), com
 * leitura pública (o site público hidrata a partir daqui) e escrita reservada
 * à equipa. Em modo demo (sem Supabase) devolve vazio → o cliente usa o
 * localStorage/defaults.
 */
const SECTIONS = { banners: "hp_banners", stories: "hp_stories", vacancies: "hp_vacancies", newsimg: "hp_newsimg", homerule: "hp_homerule" } as const;
type Section = keyof typeof SECTIONS;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ content: {}, persisted: false });
  try {
    const sb = await createClient();
    const { data } = await sb.from("site_settings").select("key, value").in("key", Object.values(SECTIONS));
    const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const content: Record<string, unknown> = {};
    for (const [section, key] of Object.entries(SECTIONS)) if (byKey[key] != null) content[section] = byKey[key];
    return NextResponse.json({ content, persisted: true });
  } catch {
    return NextResponse.json({ content: {}, persisted: false });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!isStaff(session.agent)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  let body: { section?: string; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const section = body.section as Section | undefined;
  if (!section || !(section in SECTIONS) || body.value === undefined) {
    return NextResponse.json({ error: "invalid_section" }, { status: 400 });
  }

  try {
    const sb = await createClient();
    const { error } = await sb.from("site_settings").upsert({ key: SECTIONS[section], value: body.value }, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, error: "save_failed" }, { status: 500 });
  }
}
