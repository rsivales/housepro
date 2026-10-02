import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Estado editável do workspace legal por processo (secções, checklist,
 * atividade, versão). Apenas profissionais (sessão com perfil) leem/escrevem;
 * a RLS de legal_workspaces reforça no servidor. Em modo demo → persisted:false
 * (o componente cai para localStorage).
 */

export async function GET(request: Request) {
  const processId = new URL(request.url).searchParams.get("process") ?? "";
  if (!processId) return NextResponse.json({ error: "missing_process" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ data: null, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ data: null, persisted: false }, { status: session ? 403 : 401 });

  try {
    const sb = await createClient();
    const { data } = await sb.from("legal_workspaces").select("data").eq("process_id", processId).maybeSingle();
    return NextResponse.json({ data: data?.data ?? null, persisted: true });
  } catch {
    return NextResponse.json({ data: null, persisted: false });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { processId?: string; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const processId = String(body.processId ?? "").trim();
  if (!processId || body.data == null || typeof body.data !== "object") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const sb = await createClient();
    const { error } = await sb
      .from("legal_workspaces")
      .upsert({ process_id: processId, data: body.data, updated_at: new Date().toISOString() }, { onConflict: "process_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, error: "save_failed" }, { status: 500 });
  }
}
