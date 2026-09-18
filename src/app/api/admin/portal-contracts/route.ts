import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Estado REAL dos contratos/exportação por portal (Idealista, Imovirtual,
 * Facebook, etc.) — antes só existia em localStorage do browser ("estado
 * guardado localmente (protótipo)"), por isso desaparecia ao mudar de
 * dispositivo ou limpar dados. Guardado em site_settings, com service_role
 * (evita depender de has_role() ao nível do RLS — só coordenação e acima
 * usam esta rota, validado aqui).
 *
 *  GET  → estado atual (staff).
 *  PUT  → grava (staff). { id: { active, contract, lastExport? } }
 */
const KEY = "portalcontracts";

async function requireStaff() {
  const session = await getSession();
  if (!session || session.demo || !isStaff(session.agent)) return null;
  return session;
}

export type PortalContractState = Record<string, { active: boolean; contract: boolean; lastExport?: string }>;

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ state: {}, persisted: false });
  if (!hasServiceRole()) return NextResponse.json({ state: {}, persisted: false });

  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json({ state: (data?.value as PortalContractState) ?? {}, persisted: true });
}

export async function PUT(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  let body: PortalContractState;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert({ key: KEY, value: body, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, state: body });
}
