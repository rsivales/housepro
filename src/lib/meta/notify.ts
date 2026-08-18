import type { Lead } from "@/lib/data/leads";
import { notifyGeneric } from "@/lib/notify";
import { insertNotifications } from "@/lib/db/repo";
import { mask } from "@/lib/meta/secrets";

/**
 * Comunicações do módulo Meta CRM: avisa o consultor (app + email) quando lhe é
 * atribuída uma lead. Best-effort — nunca lança. O corpo enviado para canais
 * externos mascara o contacto (PII), enquanto a notificação na app (privada ao
 * consultor) pode conter o essencial para ele agir.
 */
export async function notifyLeadAssigned(opts: {
  lead: Lead;
  agentId: string;
  agentName?: string;
  agentEmail?: string;
  campaignName?: string;
}): Promise<void> {
  const { lead, agentId, agentEmail, campaignName } = opts;

  const linhas = [
    "Nova lead atribuída — HousePro",
    campaignName ? `Campanha: ${campaignName}` : null,
    `Cliente: ${lead.name}`,
    `Contacto: ${mask(lead.contact)}`, // externo → mascarado
    lead.zone ? `Zona: ${lead.zone}` : null,
    lead.budget ? `Orçamento: ${lead.budget}` : null,
    "Abre o Meta CRM para ver os detalhes e contactar.",
  ].filter(Boolean) as string[];

  await notifyGeneric({
    subject: "Nova lead atribuída",
    text: linhas.join("\n"),
    to: agentEmail ? [agentEmail] : undefined,
  });

  // Notificação na app (privada ao consultor) — liga ao pipeline.
  await insertNotifications([
    {
      userId: agentId,
      type: "meta_lead",
      title: "Nova lead atribuída",
      body: `${lead.name}${lead.zone ? ` · ${lead.zone}` : ""}`,
      href: "/app/meta/pipeline",
    },
  ]);
}
