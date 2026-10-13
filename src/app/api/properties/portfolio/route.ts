import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { portfolioSession, operationError, UUID } from "@/lib/portfolio/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const s = await portfolioSession();
  if (!s)
    return NextResponse.json(
      { error: "Faça login para gerir imóveis." },
      { status: 401 },
    );
  const scope =
    new URL(request.url).searchParams.get("scope") === "agency"
      ? "agency"
      : "mine";
  const db = createAdminClient();
  const { data, error } = await db.rpc("portfolio_list", {
    p_actor: s.agent.id,
    p_scope: scope,
  });
  if (error) {
    const e = operationError(error.message);
    return NextResponse.json({ error: e.error }, { status: e.status });
  }
  let query = db
    .from("profiles")
    .select("id,name,agency_id")
    .neq("active", false)
    .order("name");
  if (!data.capabilities.global)
    query = query.eq("agency_id", s.agent.agencyId);
  const { data: agents, error: agentError } = await query;
  if (agentError)
    return NextResponse.json(
      { error: "Não foi possível carregar os responsáveis." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      ...data,
      viewerId: s.agent.id,
      readOnly: Boolean(s.viewingAs),
      agents: (agents ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        agencyId: a.agency_id,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function PATCH(request: Request) {
  const s = await portfolioSession(true);
  if (!s)
    return NextResponse.json(
      { error: "Sessão inválida ou modo de supervisão sem escrita." },
      { status: 401 },
    );
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !Array.isArray(b.ids) ||
    b.ids.length < 1 ||
    b.ids.length > 100 ||
    b.ids.some((id: unknown) => typeof id !== "string" || !UUID.test(id)) ||
    !["approve", "reject", "activate", "deactivate", "submit"].includes(
      b.action,
    ) ||
    (b.reason != null && typeof b.reason !== "string")
  )
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("portfolio_action", {
    p_actor: s.agent.id,
    p_ids: [...new Set(b.ids)],
    p_action: b.action,
    p_reason: b.reason?.slice(0, 2000) || null,
  });
  if (error) {
    const e = operationError(error.message);
    return NextResponse.json({ error: e.error }, { status: e.status });
  }
  return NextResponse.json({ ok: true, ...data });
}
