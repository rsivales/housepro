import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getLawyerConfig } from "@/lib/db/repo";
import type { LawyerConfig } from "@/lib/data/legalflow";

/**
 * Configuração do advogado (honorários/serviços/pagamento) — site_settings "lawyer".
 *  GET  → configuração atual (o consultor vê os preços ao pedir).
 *  POST → grava (só o advogado/administração).
 */
export async function GET() {
  const config = await getLawyerConfig();
  return NextResponse.json({ config });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const isLawyer =
    session.demo ||
    session.agent.roleKey === "advogado" ||
    session.agent.roleKey === "admin" ||
    session.agent.roleKey === "superadmin" ||
    session.agent.role === "admin";
  if (!isLawyer) {
    return NextResponse.json({ error: "Apenas o advogado pode configurar." }, { status: 403 });
  }

  let body: { config?: LawyerConfig };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const config = body.config;
  if (!config || !Array.isArray(config.services)) {
    return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
  }

  if (session.demo || !isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true, config });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert({ key: "lawyer", value: config }, { onConflict: "key" });
    if (error) throw error;
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config });
}
