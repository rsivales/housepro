import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { assignLead } from "@/lib/db/repo";
import { agents } from "@/lib/data/mock";
import { notifyLeadAssigned } from "@/lib/meta/notify";
import type { Lead } from "@/lib/data/leads";

/**
 * Atribui/reatribui uma lead a um consultor específico (obrigatório indicar o
 * consultor). Permitido a staff e ao próprio responsável/origem (RLS reforça).
 *  POST { leadId, agentId, reassign?, note? }
 */

const STAFF = ["coordenador", "diretor", "admin", "superadmin"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const roleKey = session.agent.roleKey ?? "";
  const canManage = STAFF.includes(roleKey) || session.agent.role === "admin";
  if (!session.demo && !canManage) {
    return NextResponse.json(
      { error: "Apenas a coordenação/direção pode distribuir leads." },
      { status: 403 }
    );
  }

  let body: {
    leadId?: string;
    agentId?: string;
    reassign?: boolean;
    note?: string;
    leadName?: string;
    zone?: string;
    budget?: string;
    contact?: string;
    campaignName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.leadId || !body.agentId) {
    return NextResponse.json(
      { error: "É obrigatório indicar a lead e o consultor específico." },
      { status: 400 }
    );
  }

  const agent = agents.find((a) => a.id === body.agentId);
  const agentName = agent?.name;

  const ok = await assignLead({
    leadId: String(body.leadId),
    agentId: String(body.agentId),
    agentName,
    reassign: Boolean(body.reassign),
    note: body.note,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "assign_failed" }, { status: 500 });

  // Comunicação ao consultor (app + email), best-effort.
  const leadSummary: Lead = {
    id: String(body.leadId),
    ownerId: "",
    name: body.leadName ?? "Nova lead",
    contact: body.contact ?? "",
    intent: "mensagem",
    source: "facebook",
    status: "novo",
    createdAt: new Date().toISOString(),
    zone: body.zone,
    budget: body.budget,
  };
  await notifyLeadAssigned({
    lead: leadSummary,
    agentId: String(body.agentId),
    agentName,
    agentEmail: agent?.email,
    campaignName: body.campaignName,
  });

  return NextResponse.json({ ok: true, agentName, demo: session.demo });
}
