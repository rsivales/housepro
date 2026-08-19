import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createEmailCampaign, listEmailCampaigns } from "@/lib/db/repo";
import type { EmailBlock, EmailCampaignType, Segment } from "@/lib/data/xcampaigns";

/**
 * X Campaigns — campanhas de email.
 *  GET  → campanhas do próprio.
 *  POST → cria uma campanha. Em demo devolve o objeto sem persistir.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const campaigns = await listEmailCampaigns(session.agent.id);
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    name?: string;
    type?: EmailCampaignType;
    subject?: string;
    blocks?: EmailBlock[];
    segment?: Segment;
    scheduleAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.name || !body.subject) {
    return NextResponse.json({ error: "Faltam nome ou assunto." }, { status: 400 });
  }

  const campaign = await createEmailCampaign({
    ownerId: session.agent.id,
    name: String(body.name),
    type: body.type ?? "campanha",
    subject: String(body.subject),
    blocks: Array.isArray(body.blocks) ? body.blocks : [],
    segment: body.segment ?? {},
    scheduleAt: body.scheduleAt,
  });
  return NextResponse.json({ campaign, demo: session.demo });
}
