import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { authorizedAgency } from "@/lib/db/agency-finance";
import { readCommissionRegime } from "@/lib/db/commission-regime";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OtherIncomeCategory } from "@/lib/data/commission-regime";

const uuid = (v: unknown) => typeof v === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !uuid(body.agencyId) || !uuid(body.incomeId) || !["approve", "reject", "paid"].includes(body.action))
    return NextResponse.json({ error: "Pedido inválido." }, { status: 422 });
  try { await authorizedAgency(session.agent, body.agencyId); }
  catch { return NextResponse.json({ error: "Sem acesso a esta agência." }, { status: 403 }); }
  const sb = createAdminClient();
  const { data: income, error } = await sb.from("consultant_other_income").select("id,status,category,gross_amount")
    .eq("id", body.incomeId).eq("agency_id", body.agencyId).maybeSingle();
  if (error || !income) return NextResponse.json({ error: "Rendimento não encontrado nesta agência." }, { status: 404 });
  const expected = body.action === "paid" ? "aprovado" : "pendente";
  if (income.status !== expected) return NextResponse.json({ error: "O estado mudou. Atualize a página." }, { status: 409 });
  const update: Record<string, unknown> = { status: body.action === "approve" ? "aprovado" : body.action === "reject" ? "recusado" : "pago", decided_by: session.agent.id, decided_at: new Date().toISOString() };
  if (body.action === "approve") {
    const { plan, version } = await readCommissionRegime(body.agencyId);
    const pct = plan.otherIncomeShares[income.category as OtherIncomeCategory];
    const gross = Number(income.gross_amount);
    const consultant = Math.round(gross * pct) / 100;
    update.consultant_share_pct = pct;
    update.consultant_amount = consultant;
    update.agency_amount = Math.round(gross * 100) / 100 - consultant;
    update.regime_version = version;
  }
  const { data: saved, error: writeError } = await sb.from("consultant_other_income").update(update)
    .eq("id", body.incomeId).eq("agency_id", body.agencyId).eq("status", expected).select("id").maybeSingle();
  if (writeError) return NextResponse.json({ error: "Não foi possível atualizar o rendimento." }, { status: 503 });
  if (!saved) return NextResponse.json({ error: "O estado mudou. Atualize a página." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
