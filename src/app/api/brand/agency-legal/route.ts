import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isBrandAdmin } from "@/lib/data/roles";
import { blankLegal, type AgencyLegal } from "@/lib/data/agency-legal";

/**
 * Dados legais das agências — guardados em site_settings (chave "agency_legal")
 * como { agencyId: AgencyLegal }. Assim cobre tanto as agências base como as
 * criadas (que vivem em site_settings), sem depender das colunas da tabela.
 *
 *  GET → mapa atual.
 *  PUT { id, legal } → atualiza uma agência (merge no mapa). Direção/super admin.
 */
const KEY = "agency_legal";
type LegalMap = Record<string, AgencyLegal>;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ config: {}, persisted: false });
  const session = await getSession();
  if (!session || session.demo || !isBrandAdmin(session.agent)) {
    return NextResponse.json({ config: {}, persisted: false }, { status: session ? 403 : 401 });
  }
  try {
    const sb = await createClient();
    const { data } = await sb.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    return NextResponse.json({ config: (data?.value as LegalMap) ?? {}, persisted: true });
  } catch {
    return NextResponse.json({ config: {}, persisted: false });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, persisted: false });
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!isBrandAdmin(session.agent)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  let body: { id?: string; legal?: Partial<AgencyLegal> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  if (!id || !body.legal || typeof body.legal !== "object") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const legal: AgencyLegal = { ...blankLegal(), ...body.legal, docs: body.legal.docs ?? {} };

  try {
    const sb = await createClient();
    const { data } = await sb.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    const map: LegalMap = (data?.value as LegalMap) ?? {};
    map[id] = legal;
    const { error } = await sb.from("site_settings").upsert({ key: KEY, value: map }, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, error: "save_failed" }, { status: 500 });
  }
}
