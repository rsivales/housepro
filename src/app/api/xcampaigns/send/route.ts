import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import {
  listContactsByOwner,
  listSuppressions,
  listLeadsByEmailList,
  getEmailCampaignById,
  recordSandboxSend,
} from "@/lib/db/repo";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmailShell } from "@/lib/email-template";
import { selectRecipients, simulateSend, renderVariables, renderBlocksHtml, type Segment, type MergeVar } from "@/lib/data/xcampaigns";

const MAX_REAL_RECIPIENTS = 200;

/**
 * X Campaigns — envio. Por defeito simula (SANDBOX): calcula os destinatários
 * pelo segmento (+ leads atribuídas diretamente à lista, quando se envia para
 * uma lista guardada), respeita as supressões e regista o email na cronologia
 * sem enviar nada real. Com { real: true } e o Resend configurado, envia a
 * sério — pedido explícito do utilizador, nunca automático.
 *  POST { campaignId, subject, segment, listId?, real? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { campaignId?: string; subject?: string; segment?: Segment; listId?: string; real?: boolean };
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

  if (!body.real) {
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

  // ── Envio real (Resend) — pedido explícito do utilizador ───────────────────
  if (session.demo) return NextResponse.json({ error: "Envio real indisponível em modo demo." }, { status: 403 });
  const delivery = await emailDeliveryCredentials();
  if (!delivery.enabled || !delivery.sender || !delivery.apiKey) {
    return NextResponse.json({ error: "Configure o Resend antes do envio real." }, { status: 503 });
  }
  const campaign = await getEmailCampaignById(String(body.campaignId), session.agent.id);
  if (!campaign) return NextResponse.json({ error: "Campanha indisponível." }, { status: 404 });
  if (recipients.length === 0) return NextResponse.json({ error: "Sem destinatários para este segmento." }, { status: 422 });
  if (recipients.length > MAX_REAL_RECIPIENTS) {
    return NextResponse.json({ error: `Máximo de ${MAX_REAL_RECIPIENTS} destinatários por envio real — estreite o segmento ou divida em várias campanhas.` }, { status: 422 });
  }

  let delivered = 0;
  const montraLink = `https://housepro.pt/consultor/${session.agent.id}`;
  for (const r of recipients) {
    const ctx: Partial<Record<MergeVar, string>> = {
      nome: r.name || "Cliente",
      consultor: session.agent.name,
      agencia: session.agent.agency || "HousePro",
      link: montraLink,
      assinatura: session.agent.name,
    };
    const idempotency = createHash("sha256").update(`xcampaign/${campaign.id}:${(r.email ?? "").toLowerCase()}`).digest("hex");
    const subject = renderVariables(String(body.subject), ctx);
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${delivery.apiKey}`, "content-type": "application/json", "Idempotency-Key": idempotency },
        body: JSON.stringify({
          from: delivery.sender,
          to: [r.email],
          subject,
          html: houseproEmailShell(subject, renderBlocksHtml(campaign.blocks, ctx), "HOUSEPRO · X CAMPAIGNS"),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (result.ok) delivered++;
    } catch {
      /* conta como falha deste destinatário, continua os restantes */
    }
  }

  const stats = { sent: recipients.length, delivered, opened: 0, clicked: 0, bounced: recipients.length - delivered, unsubscribed: 0 };
  await recordSandboxSend({
    campaignId: String(body.campaignId),
    subject: String(body.subject),
    recipients: recipients.map((c) => ({ contactId: c.id, email: c.email, name: c.name })),
    stats,
    actorId: session.agent.id,
    actorName: session.agent.name,
    sandbox: false,
  });

  return NextResponse.json({ stats, recipients: recipients.length, sandbox: false });
}
