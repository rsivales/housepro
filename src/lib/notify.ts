import type { Lead } from "@/lib/data/leads";

/**
 * Notificação ao consultor quando entra uma lead. Best-effort: nunca lança
 * exceção (uma falha de notificação não deve impedir o registo da lead).
 *
 * Canais (ativados por variáveis de ambiente, para funcionar em produção sem
 * acoplar a um fornecedor específico):
 *  - LEAD_WEBHOOK_URL     → POST JSON { text, lead } (Slack/Zapier/Make/n8n…)
 *  - RESEND_API_KEY + LEAD_NOTIFY_EMAIL + LEAD_FROM_EMAIL → email via Resend
 *
 * Sem variáveis configuradas (ex.: modo demo), regista no log e devolve [].
 */

const INTENT_LABEL: Record<Lead["intent"], string> = {
  mensagem: "Nova mensagem",
  visita: "Pedido de visita",
  custos: "Pedido de valor com despesas",
};

export interface NotifyContext {
  agentName?: string;
  agentEmail?: string;
  propertyRef?: string;
  propertyUrl?: string;
  channel?: string;
}

export async function notifyLead(
  lead: Lead,
  ctx: NotifyContext = {}
): Promise<string[]> {
  const channels: string[] = [];
  const title = INTENT_LABEL[lead.intent] ?? "Nova lead";
  const linhas = [
    `${title} — HousePro`,
    ctx.channel ? `Via: ${ctx.channel}` : null,
    ctx.propertyRef ? `Imóvel: ${ctx.propertyRef}` : null,
    `Cliente: ${lead.name} (${lead.contact}${lead.email ? `, ${lead.email}` : ""})`,
    lead.message ? `Mensagem: ${lead.message}` : null,
    ctx.agentName ? `Atribuída a: ${ctx.agentName}` : null,
    ctx.propertyUrl ? `Link: ${ctx.propertyUrl}` : null,
  ].filter(Boolean) as string[];
  const text = linhas.join("\n");

  // 1) Webhook genérico (Slack-compatível)
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lead, context: ctx }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) channels.push("webhook");
    } catch {
      /* best-effort */
    }
  }

  // 2) Email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const to = [ctx.agentEmail, process.env.LEAD_NOTIFY_EMAIL].filter(
    Boolean
  ) as string[];
  const from = process.env.LEAD_FROM_EMAIL;
  if (resendKey && to.length && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: `${title}${ctx.propertyRef ? ` · ${ctx.propertyRef}` : ""}`,
          text,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) channels.push("email");
    } catch {
      /* best-effort */
    }
  }

  if (channels.length === 0) {
    // Modo demo / sem canais configurados.
    console.info("[lead] nova lead (sem canais de notificação):", text);
  }
  return channels;
}


/**
 * Notificação genérica (webhook + email via Resend) para um ou mais destinatários.
 * Best-effort: nunca lança. Sem canais configurados, regista no log.
 */
export async function notifyGeneric(opts: {
  subject: string;
  text: string;
  to?: (string | undefined)[];
}): Promise<string[]> {
  const channels: string[] = [];

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: opts.text }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) channels.push("webhook");
    } catch {
      /* best-effort */
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const to = (opts.to ?? [process.env.LEAD_NOTIFY_EMAIL]).filter(Boolean) as string[];
  const from = process.env.LEAD_FROM_EMAIL;
  if (resendKey && to.length && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ from, to, subject: opts.subject, text: opts.text }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) channels.push("email");
    } catch {
      /* best-effort */
    }
  }

  if (channels.length === 0) {
    console.info("[notify]", opts.subject, "\n" + opts.text);
  }
  return channels;
}
