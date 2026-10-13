import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { portfolioSession, operationError, UUID } from "@/lib/portfolio/server";
import { validUnits } from "@/lib/portfolio/types";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const s = await portfolioSession(true);
  if (!s)
    return NextResponse.json(
      { error: "Faça login. A supervisão é apenas de leitura." },
      { status: 401 },
    );
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !UUID.test(String(b.sourceId || "")) ||
    !UUID.test(String(b.batchId || "")) ||
    !UUID.test(String(b.agentId || "")) ||
    !validUnits(b.units) ||
    typeof b.copyMedia !== "boolean" ||
    (b.developmentName != null &&
      (typeof b.developmentName !== "string" || b.developmentName.length > 150))
  )
    return NextResponse.json(
      {
        error:
          "Confirme os títulos, frações únicas e valores numéricos (máximo 100).",
      },
      { status: 400 },
    );
  const { data, error } = await createAdminClient().rpc("portfolio_duplicate", {
    p_actor: s.agent.id,
    p_source: b.sourceId,
    p_batch: b.batchId,
    p_units: b.units,
    p_agent: b.agentId,
    p_copy_media: b.copyMedia,
    p_development: b.developmentName?.trim() || null,
  });
  if (error) {
    const e = operationError(error.message);
    return NextResponse.json({ error: e.error }, { status: e.status });
  }
  return NextResponse.json({ ok: true, items: data });
}
