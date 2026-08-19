import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createCampaign, listCampaigns, saveAssignmentRule } from "@/lib/db/repo";
import type { Campaign, AssignStrategy } from "@/lib/data/meta";

interface Distribution {
  strategy: AssignStrategy;
  agentId?: string;
  teamId?: string;
  pool?: string[];
  dailyLimit?: number;
  substituteId?: string;
  fallbackId?: string;
}

/**
 * Campanhas do módulo Meta CRM.
 *  GET  → lista de campanhas.
 *  POST → cria uma campanha (staff). Em modo demo devolve o objeto sem persistir,
 *         para o fluxo ser demonstrável sem Supabase.
 */

const STAFF = ["coordenador", "diretor", "admin", "superadmin"];

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // Fora de demo, só staff pode criar. Em demo, permite-se para demonstração.
  const roleKey = session.agent.roleKey ?? "";
  const canManage = STAFF.includes(roleKey) || session.agent.role === "admin";
  if (!session.demo && !canManage) {
    return NextResponse.json(
      { error: "Apenas a coordenação/direção pode criar campanhas." },
      { status: 403 }
    );
  }

  let body: Partial<Campaign> & { distribution?: Distribution };
  try {
    body = (await request.json()) as Partial<Campaign> & { distribution?: Distribution };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.name || !body.type || !body.ownerType || !body.ownerId) {
    return NextResponse.json(
      { error: "Faltam campos obrigatórios (nome, tipo, dono)." },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    name: String(body.name),
    type: body.type,
    ownerType: body.ownerType,
    ownerId: String(body.ownerId),
    ownerName: body.ownerName,
    responsibleId: body.responsibleId,
    responsibleName: body.responsibleName,
    objective: body.objective,
    metaCampaignId: body.metaCampaignId,
    status: body.status,
    createdBy: session.demo ? undefined : session.agent.id,
  });

  // Regra de distribuição (opcional). "Consultor específico" exige o consultor.
  const dist = body.distribution;
  if (dist && dist.strategy) {
    if (dist.strategy === "specific" && !dist.agentId) {
      return NextResponse.json(
        { error: "Distribuição “consultor específico” exige selecionar o consultor." },
        { status: 400 }
      );
    }
    await saveAssignmentRule({
      campaignId: campaign.id,
      strategy: dist.strategy,
      agentId: dist.agentId,
      teamId: dist.teamId,
      pool: dist.pool,
      dailyLimit: dist.dailyLimit,
      substituteId: dist.substituteId,
      fallbackId: dist.fallbackId,
    });
  }

  return NextResponse.json({ campaign, demo: session.demo });
}
