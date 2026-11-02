import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isCommercialAgent } from "@/lib/data/agent-directory";
import { createAdminClient } from "@/lib/supabase/admin";
import { agencyPeriod, dayInLisbon } from "@/lib/data/agency-finance";
import { OTHER_INCOME_CATEGORIES } from "@/lib/data/commission-regime";

const uuid = (v: unknown) => typeof v === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs || !isCommercialAgent(session.agent) || !session.agent.agencyId)
    return NextResponse.json({ error: "Só um consultor autenticado pode registar rendimentos." }, { status: 403 });
  const b = await request.json().catch(() => null);
  if (!b || !Object.hasOwn(OTHER_INCOME_CATEGORIES, b.category) || !uuid(b.requestId)) return NextResponse.json({ error: "Categoria ou pedido inválido." }, { status: 422 });
  const partner = typeof b.partner === "string" ? b.partner.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const gross = Number(b.gross);
  if (partner.length < 2 || partner.length > 160 || description.length < 3 || description.length > 500 || !Number.isFinite(gross) || gross <= 0 || gross > 100000000 || Math.round(gross * 100) !== gross * 100)
    return NextResponse.json({ error: "Indique entidade, descrição e montante positivo com duas casas decimais." }, { status: 422 });
  try { if (typeof b.date !== "string") throw new Error(); agencyPeriod(b.date, b.date); if (b.date > dayInLisbon(new Date())) throw new Error(); }
  catch { return NextResponse.json({ error: "Data inválida ou futura." }, { status: 422 }); }
  const sb = createAdminClient();
  const row = { request_id: b.requestId, agency_id: session.agent.agencyId, consultant_id: session.agent.id, category: b.category, partner_name: partner, description, earned_on: b.date, gross_amount: gross };
  const { data, error } = await sb.from("consultant_other_income").insert(row).select("id").single();
  if (error?.code === "23505") {
    const { data: existing } = await sb.from("consultant_other_income").select("id,category,partner_name,description,earned_on,gross_amount")
      .eq("consultant_id", session.agent.id).eq("request_id", b.requestId).maybeSingle();
    if (existing && existing.category === b.category && existing.partner_name === partner && existing.description === description && existing.earned_on === b.date && Number(existing.gross_amount) === gross)
      return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
    return NextResponse.json({ error: "Pedido repetido com dados diferentes." }, { status: 409 });
  }
  if (error || !data) return NextResponse.json({ error: "Não foi possível guardar o rendimento." }, { status: 503 });
  return NextResponse.json({ ok: true, id: data.id });
}
