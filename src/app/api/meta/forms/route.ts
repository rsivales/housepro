import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createLeadForm } from "@/lib/db/repo";
import type { LeadFormQuestion } from "@/lib/data/meta";

/**
 * Formulários Meta do módulo Meta CRM.
 *  POST → regista um formulário (ID do formulário no Meta + perguntas),
 *         para o webhook passar a reconhecê-lo e ligá-lo a uma campanha.
 *         Em demo devolve o objeto sem persistir.
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
      { error: "Apenas a coordenação/direção pode registar formulários." },
      { status: 403 }
    );
  }

  let body: { metaFormId?: string; name?: string; campaignId?: string; questions?: LeadFormQuestion[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const metaFormId = (body.metaFormId ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!metaFormId || !name) {
    return NextResponse.json({ error: "Faltam o ID do formulário no Meta ou o nome." }, { status: 400 });
  }

  const form = await createLeadForm({
    metaFormId,
    name,
    campaignId: body.campaignId || undefined,
    questions: Array.isArray(body.questions) ? body.questions : [],
  });
  return NextResponse.json({ form, demo: session.demo });
}
