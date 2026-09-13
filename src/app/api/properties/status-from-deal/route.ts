import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { syncPropertyStatusFromDeal } from "@/lib/db/property-status";
import { dealStageToStatus, type DealStage } from "@/lib/data/deal";

const STAGES: DealStage[] = [
  "proposta_enviada", "proposta_aceite", "reserva", "cpcv", "escritura", "concluido", "cancelado",
];

/** Aplica ao imóvel o estado correspondente à fase do negócio (Helix). Chamado
 *  pelo fluxo de processo/CRM quando um negócio avança de fase.
 *  POST { propertyId, stage } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { propertyId?: string; stage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const propertyId = String(body.propertyId ?? "").trim();
  const stage = body.stage as DealStage;
  if (!propertyId || !STAGES.includes(stage)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const property = await getPropertyById(propertyId);
  if (!property) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Permissão: angariador, co-angariador ou staff.
  const a = session.agent;
  const allowed = property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id) || isStaff(a);
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const applied = await syncPropertyStatusFromDeal(propertyId, stage);
  return NextResponse.json({ ok: true, applied, status: dealStageToStatus(stage) });
}
