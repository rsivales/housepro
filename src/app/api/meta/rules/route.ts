import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { saveAssignmentRule } from "@/lib/db/repo";
import type { AssignStrategy } from "@/lib/data/meta";

/**
 * Regra de distribuição de uma campanha (editor completo). Substitui a regra
 * ativa da campanha. "Consultor específico" exige o consultor.
 *  POST { campaignId, strategy, agentId?, teamId?, pool?, weights?, zoneMap?,
 *         budgetMap?, languageMap?, specialtyMap?, substituteId?, fallbackId?,
 *         dailyLimit? }
 */
const STAFF = ["coordenador", "diretor", "admin", "superadmin", "marketing"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const roleKey = session.agent.roleKey ?? "";
  const canManage = STAFF.includes(roleKey) || session.agent.role === "admin";
  if (!session.demo && !canManage) {
    return NextResponse.json({ error: "Sem permissão para gerir distribuição." }, { status: 403 });
  }

  let body: {
    campaignId?: string;
    strategy?: AssignStrategy;
    agentId?: string;
    teamId?: string;
    pool?: string[];
    weights?: Record<string, number>;
    zoneMap?: Record<string, string>;
    budgetMap?: Record<string, string>;
    languageMap?: Record<string, string>;
    specialtyMap?: Record<string, string>;
    substituteId?: string;
    fallbackId?: string;
    dailyLimit?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.campaignId || !body.strategy) {
    return NextResponse.json({ error: "Faltam campaignId ou estratégia." }, { status: 400 });
  }
  if (body.strategy === "specific" && !body.agentId) {
    return NextResponse.json(
      { error: "Distribuição “consultor específico” exige selecionar o consultor." },
      { status: 400 }
    );
  }

  const rule = await saveAssignmentRule({
    campaignId: String(body.campaignId),
    strategy: body.strategy,
    agentId: body.agentId,
    teamId: body.teamId,
    pool: body.pool,
    weights: body.weights,
    zoneMap: body.zoneMap,
    budgetMap: body.budgetMap,
    languageMap: body.languageMap,
    specialtyMap: body.specialtyMap,
    substituteId: body.substituteId,
    fallbackId: body.fallbackId,
    dailyLimit: body.dailyLimit,
  });
  return NextResponse.json({ rule, demo: session.demo });
}
