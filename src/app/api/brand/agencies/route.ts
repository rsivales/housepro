import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEFAULT_AGENCIES_CONFIG, type AgenciesConfig } from "@/lib/data/agencies";

/**
 * Gestão de agências (marca) — guardada em site_settings (chave "agencies"):
 * edições de nome/região e agências criadas.
 *
 *  GET  → configuração atual.
 *  POST → grava (só administração / super admin).
 */
const KEY = "agencies";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ config: DEFAULT_AGENCIES_CONFIG });
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value as Partial<AgenciesConfig>) ?? {};
    return NextResponse.json({
      config: { overrides: v.overrides ?? {}, created: v.created ?? [], suspended: v.suspended ?? [], removed: v.removed ?? [] },
    });
  } catch {
    return NextResponse.json({ config: DEFAULT_AGENCIES_CONFIG });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const r = session.agent.roleKey;
  const isAdmin = session.agent.role === "admin" || r === "admin" || r === "superadmin" || r === "diretor";
  if (!isAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  let body: { config?: Partial<AgenciesConfig> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const config: AgenciesConfig = {
    overrides: body.config?.overrides && typeof body.config.overrides === "object" ? body.config.overrides : {},
    created: Array.isArray(body.config?.created) ? body.config!.created! : [],
    suspended: strArray(body.config?.suspended),
    removed: strArray(body.config?.removed),
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert({ key: KEY, value: config }, { onConflict: "key" });
    if (error) throw error;
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config });
}
