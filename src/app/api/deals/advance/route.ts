import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { advanceDeal, getDealGate } from "@/lib/db/deals";
import type { DealStage } from "@/lib/data/deal";

const STAGES: DealStage[] = [
  "proposta_enviada", "proposta_aceite", "reserva", "cpcv", "escritura", "concluido", "cancelado",
];

/** Avança/recua a fase de um negócio; o estado do imóvel é sincronizado.
 *  POST { dealId, stage } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: { dealId?: string; stage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dealId = String(body.dealId ?? "").trim();
  const stage = body.stage as DealStage;
  if (!dealId || !STAGES.includes(stage)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Permissão: staff, equipa do negócio, ou angariador/co-angariador do imóvel.
  const a = session.agent;
  let allowed = isStaff(a) || gate.team.includes(a.id);
  if (!allowed && gate.propertyId) {
    const property = await getPropertyById(gate.propertyId);
    allowed = Boolean(
      property && (property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id))
    );
  }
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const res = await advanceDeal(dealId, stage, a.id);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
