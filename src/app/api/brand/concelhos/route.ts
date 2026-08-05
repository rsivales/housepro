import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEFAULT_CONCELHOS_CONFIG, type ConcelhosConfig } from "@/lib/data/concelhos";

/**
 * Configuração da secção "Concelhos mais procurados" (marca global) —
 * guardada em site_settings (chave "concelhos"): mostrar/ocultar, nº de
 * destaques, fotos por concelho e ativação por agência.
 *
 *  GET  → configuração atual (pública — a homepage e as montras usam-na).
 *  POST → grava (só administração).
 */
const KEY = "concelhos";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ config: DEFAULT_CONCELHOS_CONFIG });
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value as Partial<ConcelhosConfig>) ?? {};
    return NextResponse.json({ config: { ...DEFAULT_CONCELHOS_CONFIG, ...v, photos: v.photos ?? {} } });
  } catch {
    return NextResponse.json({ config: DEFAULT_CONCELHOS_CONFIG });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const isAdmin = session.agent.role === "admin" || session.agent.roleKey === "admin" || session.agent.roleKey === "superadmin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Apenas a administração pode configurar." }, { status: 403 });
  }

  let body: { config?: Partial<ConcelhosConfig> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const config: ConcelhosConfig = {
    enabled: Boolean(body.config?.enabled),
    count: Number(body.config?.count ?? 3) || 3,
    photos: (body.config?.photos && typeof body.config.photos === "object" ? body.config.photos : {}),
    agencies: body.config?.agencies ?? {},
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: KEY, value: config }, { onConflict: "key" });
    if (error) throw error;
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config });
}
