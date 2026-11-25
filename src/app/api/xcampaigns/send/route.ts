import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { listContactsByOwner, listSuppressions, listLeadsByEmailList, recordSandboxSend } from "@/lib/db/repo";
import { selectRecipients, simulateSend, type Segment } from "@/lib/data/xcampaigns";

/**
 * X Campaigns — ENVIO EM SANDBOX. Calcula os destinatários pelo segmento (+
 * leads atribuídas diretamente à lista, quando se envia para uma lista
 * guardada), respeita as supressões (unsubscribe/devoluções), simula as
 * estatísticas de entrega e regista o email na cronologia. NUNCA envia
 * emails reais aqui.
 *  POST { campaignId, subject, segment, listId? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { campaignId?: string; subject?: string; segment?: Segment; listId?: string };
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
  const fromSegment = selectRecipients(contacts, body.segment ?? {}).map((c) => ({ id: c.id, email: c.email, name: c.name }));

  // Leads atribuídas diretamente à lista (triagem manual) — além da
  // correspondência por segmento, nunca em vez dela.
  const fromList = body.listId ? await listLeadsByEmailList(session.agent.id, body.listId) : [];

  // O envio precisa sempre de um email válido; descarta duplicados e supressos.
  const seen = new Set<string>();
  const recipients = [...fromSegment, ...fromList.map((l) => ({ id: undefined as string | undefined, email: l.email, name: l.name }))].filter((r) => {
    const key = (r.email ?? "").toLowerCase();
    if (!key || suppressed.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
