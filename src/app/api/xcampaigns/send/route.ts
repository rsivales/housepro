import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { listContactsByOwner, listSuppressions, recordSandboxSend } from "@/lib/db/repo";
import { selectRecipients, simulateSend, type Segment } from "@/lib/data/xcampaigns";

/**
 * X Campaigns — ENVIO EM SANDBOX. Calcula os destinatários pelo segmento,
 * respeita as supressões (unsubscribe/devoluções), simula as estatísticas de
 * entrega e regista o email na cronologia. NUNCA envia emails reais aqui.
 *  POST { campaignId, subject, segment }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { campaignId?: string; subject?: string; segment?: Segment };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.campaignId || !body.subject) {
    return NextResponse.json({ error: "Faltam campaignId ou assunto." }, { status: 400 });
  }

  const contacts = await listContactsByOwner(session.agent.id);
  const suppressed = new Set(await listSuppressions());
  const recipients = selectRecipients(contacts, body.segment ?? {}).filter(
    (c) => !c.email || !suppressed.has(c.email.toLowerCase())
  );

  const stats = simulateSend(recipients.length);
  await recordSandboxSend({
    campaignId: String(body.campaignId),
    subject: String(body.subject),
    recipients: recipients.map((c) => ({ contactId: c.id, email: c.email, name: c.name })),
    stats,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });

  return NextResponse.json({ stats, recipients: recipients.length, sandbox: true, demo: session.demo });
}
