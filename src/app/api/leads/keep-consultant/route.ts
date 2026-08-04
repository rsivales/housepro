import { reassignLeadOwner, insertNotifications } from "@/lib/db/repo";
import { agentById } from "@/lib/data/mock";
import { signKeep } from "@/lib/data/contact-sla";
import { notifyGeneric } from "@/lib/notify";

/**
 * "Manter o mesmo consultor" — link enviado ao cliente no email de reatribuição.
 * O cliente que não concorda com a mudança clica e o contacto volta ao consultor
 * original, até ser atendido. Protegido por assinatura (sig).
 */
function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0c;color:#e9e9ea;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}` +
      `.card{max-width:460px;background:#141416;border:1px solid #26262a;border-radius:20px;padding:32px;text-align:center}` +
      `h1{font-size:20px;margin:0 0 8px}p{color:#a9a9ad;line-height:1.5;margin:0}</style></head>` +
      `<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leadId = url.searchParams.get("lead") ?? "";
  const agentId = url.searchParams.get("a") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  if (!leadId || !agentId || sig !== signKeep(leadId, agentId)) {
    return page("Ligação inválida", "Este pedido não é válido ou expirou. Se precisar de ajuda, responda ao email que recebeu.");
  }

  const agent = agentById(agentId);
  await reassignLeadOwner(leadId, agentId); // devolve ao consultor original
  await insertNotifications([{
    userId: agentId, type: "qualidade",
    title: "O cliente pediu para o manter",
    body: "O contacto volta a si. Atenda-o com prioridade — foi mantido a pedido do cliente.",
    href: "/app",
  }]);
  await notifyGeneric({
    subject: "HousePro — cliente pediu para manter o consultor",
    text: `O cliente do contacto ${leadId} pediu para manter ${agent?.name ?? "o consultor original"}. O contacto foi devolvido; deve ser atendido com prioridade.\n\n— HousePro`,
  });

  return page(
    "Pedido registado",
    `Vamos manter o(a) seu(sua) consultor(a)${agent ? ` <strong>${agent.name}</strong>` : ""}. Ele(a) foi notificado(a) para o(a) contactar com prioridade. Obrigado!`
  );
}
