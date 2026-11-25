import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { updateLeadCreditStatus } from "@/lib/db/repo";

const VALID = ["aprovado", "nao_aprovado", "pendente"];

/**
 * Define/limpa a etiqueta de crédito da lead (aprovado/não aprovado/pendente).
 *  POST { leadId, creditStatus: string | null }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { leadId?: string; creditStatus?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.leadId) return NextResponse.json({ error: "Falta leadId." }, { status: 400 });
  if (body.creditStatus != null && !VALID.includes(body.creditStatus)) {
    return NextResponse.json({ error: "Estado de crédito inválido." }, { status: 400 });
  }

  const ok = await updateLeadCreditStatus({
    leadId: String(body.leadId),
    creditStatus: (body.creditStatus ?? null) as "aprovado" | "nao_aprovado" | "pendente" | null,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
