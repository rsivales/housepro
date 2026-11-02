import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { authorizedAgency } from "@/lib/db/agency-finance";
import { createAdminClient } from "@/lib/supabase/admin";
import { CASH_CATEGORIES, CASH_INCOME_CATEGORIES, agencyPeriod } from "@/lib/data/agency-finance";

const uuid = (v: unknown) => typeof v === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
export async function POST(request: Request) {
  const s = await getSession();
  if (!s || s.demo || s.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !uuid(b.agencyId)) return NextResponse.json({ error: "Agência inválida." }, { status: 400 });
  try { await authorizedAgency(s.agent, b.agencyId); }
  catch { return NextResponse.json({ error: "Sem acesso a esta agência." }, { status: 403 }); }
  const sb = createAdminClient();
  if (b.action === "stop") {
    if (!uuid(b.seriesId)) return NextResponse.json({ error: "Contrato mensal inválido." }, { status: 400 });
    const { data, error } = await sb.rpc("stop_agency_recurring_expenses", { p_agency: b.agencyId, p_series: b.seriesId, p_actor: s.agent.id });
    if (error) return NextResponse.json({ error: "Não foi possível parar as mensalidades futuras." }, { status: 409 });
    return NextResponse.json({ ok: true, stopped: data });
  }
  const amount = Number(String(b.amount ?? "").replace(",", "."));
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const months = Number(b.months);
  if (!uuid(b.requestId) || !Object.hasOwn(CASH_CATEGORIES, b.category) || CASH_INCOME_CATEGORIES.some(x => x === b.category)
    || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
    || description.length < 3 || description.length > 500 || !Number.isInteger(months) || months < 2 || months > 60)
    return NextResponse.json({ error: "Indique categoria de despesa, valor mensal e duração de 2 a 60 meses." }, { status: 422 });
  try { if (typeof b.start !== "string") throw new Error(); agencyPeriod(b.start, b.start); }
  catch { return NextResponse.json({ error: "Data inicial inválida." }, { status: 422 }); }
  const { data, error } = await sb.rpc("create_agency_recurring_expenses", { p_agency: b.agencyId, p_request: b.requestId, p_category: b.category, p_description: description, p_amount: amount, p_start: b.start, p_months: months, p_actor: s.agent.id });
  if (error) return NextResponse.json({ error: error.message.includes("request_conflict") ? "Este pedido já foi utilizado com outros dados." : "Não foi possível criar as mensalidades." }, { status: error.message.includes("request_conflict") ? 409 : 503 });
  return NextResponse.json({ ok: true, seriesId: data, months });
}
