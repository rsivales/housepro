import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedAgency } from "@/lib/db/agency-finance";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { uuid, validFeeAmount, validFeeMonth } from "@/lib/data/helix-fees";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const actor = session.agent;
  const sb = createAdminClient();
  if (body.action === "propose") {
    if (!uuid(body.agencyId) || !uuid(body.agentId)) return NextResponse.json({ error: "Agência ou agente inválido." }, { status: 422 });
    try { await authorizedAgency(actor, body.agencyId); } catch { return NextResponse.json({ error: "Sem acesso à agência." }, { status: 403 }); }
    const { error } = await sb.rpc("request_pro_producer", { p_agency: body.agencyId, p_agent: body.agentId, p_actor: actor.id });
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Já existe uma proposta pendente ou aprovada." : "Não foi possível enviar a proposta." }, { status: 409 });
    return NextResponse.json({ ok: true, message: "Proposta enviada para aprovação da Marca." });
  }
  if (!isNetworkFinanceAdmin(actor)) return NextResponse.json({ error: "Apenas a Marca pode efetuar esta operação." }, { status: 403 });
  if (body.action === "decide") {
    if (!uuid(body.id) || typeof body.approve !== "boolean") return NextResponse.json({ error: "Decisão inválida." }, { status: 422 });
    const { error } = await sb.rpc("decide_pro_producer", { p_id: body.id, p_actor: actor.id, p_approve: body.approve });
    if (error) return NextResponse.json({ error: "A proposta já foi decidida ou o agente mudou de agência." }, { status: 409 });
    // The daily cron also picks this up if immediate generation is unavailable.
    await sb.rpc("generate_helix_fees");
    return NextResponse.json({ ok: true, message: "Decisão registada." });
  }
  if (body.action === "create_plan") {
    if (!uuid(body.agencyId) || (body.agentId !== null && !uuid(body.agentId)) || !validFeeAmount(body.amount) || !validFeeMonth(body.startsOn)) {
      return NextResponse.json({ error: "Indique agência, destinatário, valor positivo e mês inicial sem retroativos." }, { status: 422 });
    }
    if (body.agentId) {
      const { data, error } = await sb.from("profiles").select("id").eq("id", body.agentId).eq("agency_id", body.agencyId).eq("active", true).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "O agente não pertence à agência." }, { status: 422 });
    }
    const { error } = await sb.from("helix_fee_plans").insert({ agency_id: body.agencyId, agent_id: body.agentId, amount: body.amount, starts_on: body.startsOn, created_by: actor.id });
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Já existe um fee tecnológico ativo. Termine-o antes de criar outro." : "Não foi possível criar o fee." }, { status: 409 });
    await sb.rpc("generate_helix_fees");
    return NextResponse.json({ ok: true, message: "Fee tecnológico configurado." });
  }
  if (body.action === "stop_plan") {
    if (!uuid(body.id)) return NextResponse.json({ error: "Fee inválido." }, { status: 422 });
    const { data, error } = await sb.from("helix_fee_plans").update({ stopped_at: new Date().toISOString() }).eq("id", body.id).is("stopped_at", null).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "O fee já está terminado ou indisponível." }, { status: 409 });
    return NextResponse.json({ ok: true, message: "Fee terminado para os próximos lançamentos." });
  }
  if (body.action === "paid") {
    if (!uuid(body.id)) return NextResponse.json({ error: "Lançamento inválido." }, { status: 422 });
    const { data, error } = await sb.from("helix_fee_charges").update({ status: "pago", paid_at: new Date().toISOString(), paid_by: actor.id }).eq("id", body.id).eq("status", "pendente").select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Lançamento já atualizado ou indisponível." }, { status: 409 });
    return NextResponse.json({ ok: true, message: "Pagamento registado." });
  }
  if (body.action === "generate") {
    const { error } = await sb.rpc("generate_helix_fees");
    if (error) return NextResponse.json({ error: "Não foi possível gerar os lançamentos." }, { status: 503 });
    return NextResponse.json({ ok: true, message: "Lançamentos deste mês verificados sem duplicar cobranças." });
  }
  return NextResponse.json({ error: "Operação inválida." }, { status: 422 });
}
