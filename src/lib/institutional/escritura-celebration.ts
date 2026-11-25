import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmailShell } from "@/lib/email-template";

const TEMPLATE_KEY = "deal_escritura_celebration";

const DEFAULT_SUBJECT = "Parabéns pela sua nova casa, {nome}! 🏡💛";
const DEFAULT_BODY =
  "Hoje é um dia especial — a escritura da sua casa!\n\n" +
  "Foi um gosto enorme acompanhá-lo(a) nesta jornada, do primeiro \"olá\" até este momento. " +
  "Que esta casa se encha de histórias felizes, boas memórias e muito carinho.\n\n" +
  "Um abraço grande da parte de toda a equipa HousePro — estamos aqui sempre que precisar. 💛🏡";

/**
 * Envia um email fofinho de parabéns ao comprador no dia em que o negócio
 * passa a "escritura" (pela primeira vez). Best-effort, nunca uma segunda
 * vez para o mesmo negócio (deals.escritura_celebrated_at).
 */
export async function celebrateEscritura(dealId: string): Promise<void> {
  const sb = createAdminClient();

  const { data: deal } = await sb
    .from("deals")
    .select("escritura_celebrated_at, buyer_name, buyer_contact:contacts!buyer_contact_id(id,name,email)")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal || deal.escritura_celebrated_at) return;

  const contact = (Array.isArray(deal.buyer_contact) ? deal.buyer_contact[0] : deal.buyer_contact) as { name?: string; email?: string } | null;
  const email = contact?.email;
  if (!email) return;

  // Marca já, antes de enviar — evita duplicar em corridas concorrentes
  // (nunca re-tenta; preferimos perder um envio raro a duplicar o carinho).
  const { data: claimed } = await sb
    .from("deals")
    .update({ escritura_celebrated_at: new Date().toISOString() })
    .eq("id", dealId)
    .is("escritura_celebrated_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  const delivery = await emailDeliveryCredentials();
  if (!delivery.enabled || !delivery.apiKey || !delivery.sender) return;

  const { data: template } = await sb.from("notification_templates").select("subject,body").eq("key", TEMPLATE_KEY).maybeSingle();
  const nome = contact?.name || deal.buyer_name || "Cliente";
  const subject = (template?.subject || DEFAULT_SUBJECT).replace(/\{nome\}/g, nome);
  const bodyText = (template?.body || DEFAULT_BODY).replace(/\{nome\}/g, nome);
  const html = houseproEmailShell(
    subject,
    `<h1 style="font-size:24px;margin:0 0 20px">${subject}</h1><div style="font-size:16px;line-height:1.7;white-space:pre-line">${bodyText}</div>`,
    "HOUSEPRO · ESCRITURA 🏡",
  );

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${delivery.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: delivery.sender, to: [email], subject, html }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    /* best-effort */
  }
}
