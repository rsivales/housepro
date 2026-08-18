import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { saveFieldMapping } from "@/lib/db/repo";
import type { FieldMapping } from "@/lib/data/meta";

/**
 * Mapeamento pergunta→campo de um formulário Meta.
 *  POST { formId, map } → guarda (staff). Em demo devolve ok sem persistir.
 */

const STAFF = ["coordenador", "diretor", "admin", "superadmin"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const roleKey = session.agent.roleKey ?? "";
  const canManage = STAFF.includes(roleKey) || session.agent.role === "admin";
  if (!session.demo && !canManage) {
    return NextResponse.json(
      { error: "Apenas a coordenação/direção pode configurar o mapeamento." },
      { status: 403 }
    );
  }

  let body: { formId?: string; map?: FieldMapping["map"] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.formId || !Array.isArray(body.map)) {
    return NextResponse.json({ error: "Faltam formId ou map." }, { status: 400 });
  }

  const ok = await saveFieldMapping(String(body.formId), body.map);
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
