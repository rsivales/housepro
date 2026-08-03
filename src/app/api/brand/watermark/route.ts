import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { defaultWatermark, type WatermarkConfig } from "@/lib/config";

/**
 * Estilo GLOBAL da marca de água (texto ou logótipo), partilhado por todos os
 * consultores e dispositivos.
 *
 *  GET  → devolve a configuração global (pública; usada no carregamento de
 *         imóvel para compor a marca em cada foto).
 *  POST → grava a configuração (só administração). O logótipo em si é enviado
 *         para o Storage pelo browser; aqui guarda-se apenas o URL + estilo.
 */

const KEY = "watermark";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ config: null, source: "default" });
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    return NextResponse.json({
      config: (data?.value as WatermarkConfig) ?? null,
      source: data ? "supabase" : "default",
    });
  } catch {
    return NextResponse.json({ config: null, source: "error" });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }
  const isAdmin = session.agent.role === "admin" || session.agent.roleKey === "admin";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Apenas a administração pode definir a marca de água global." },
      { status: 403 }
    );
  }

  let body: Partial<WatermarkConfig>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Normaliza para o formato esperado (evita guardar campos estranhos).
  const config: WatermarkConfig = {
    mode: body.mode === "logo" ? "logo" : "text",
    label: typeof body.label === "string" ? body.label.slice(0, 60) : defaultWatermark.label,
    logo: typeof body.logo === "string" ? body.logo : undefined,
    size: clamp(Number(body.size ?? defaultWatermark.size), 2, 14),
    position: (body.position as WatermarkConfig["position"]) ?? defaultWatermark.position,
    opacity: clamp(Number(body.opacity ?? defaultWatermark.opacity), 20, 100),
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: KEY, value: config, updated_at: new Date().toISOString() });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status: 500 }
    );
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
