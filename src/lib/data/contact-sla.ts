/**
 * SLA de contacto — combate à ausência de acompanhamento.
 *
 * Regra: um contacto por atender há mais de 48h gera um 1.º AVISO (reparo de
 * "abandono"), com notificação por app + email ao consultor a avisar que, ao
 * 2.º aviso dentro das próximas 24h, o contacto é atribuído automaticamente a
 * outro agente. Passadas essas 24h sem contacto, há REATRIBUIÇÃO automática:
 * o cliente recebe um email com a justificação e a opção de manter o consultor.
 */

import { createHmac } from "crypto";

import type { Agent } from "@/lib/data/types";

export const CONTACT_SLA_HOURS = 48;
export const CONTACT_ESCALATION_HOURS = 24;

export type SlaOutcome = "ok" | "warn" | "waiting" | "escalate";

/** Estado do SLA de um contacto, dado o momento do 1.º aviso (se houve). */
export function contactSlaState(opts: {
  createdAt: string;
  contacted: boolean;
  warnedAt?: string;
  now?: Date;
}): SlaOutcome {
  const now = opts.now ?? new Date();
  if (opts.contacted) return "ok";
  const ageH = (now.getTime() - new Date(opts.createdAt).getTime()) / 3_600_000;
  if (!opts.warnedAt) return ageH >= CONTACT_SLA_HOURS ? "warn" : "ok";
  const sinceWarn = (now.getTime() - new Date(opts.warnedAt).getTime()) / 3_600_000;
  return sinceWarn >= CONTACT_ESCALATION_HOURS ? "escalate" : "waiting";
}

/** Assina o link de "manter o mesmo consultor" enviado ao cliente. */
export function signKeep(leadId: string, agentId: string): string {
  return createHmac("sha256", process.env.CONTACT_REVERT_SECRET || "housepro-dev")
    .update(`${leadId}:${agentId}`)
    .digest("hex")
    .slice(0, 24);
}

/** Escolhe o colega que recebe o contacto (mesma agência, ativo, != dono). */
export function pickReassignTarget(candidates: Agent[], excludeId: string): Agent | undefined {
  return candidates.find((a) => a.id !== excludeId);
}

/** Email/app ao consultor: 1.º aviso de ausência de contacto. */
export function agentWarningMessage(leadName: string, propertyRef?: string) {
  const ref = propertyRef ? ` (${propertyRef})` : "";
  return {
    subject: `HousePro — contacto por atender há +48h: ${leadName}`,
    text:
      `O contacto de ${leadName}${ref} está sem resposta há mais de ${CONTACT_SLA_HOURS} horas.\n\n` +
      `⚠️ Este é o 1.º aviso. Se não for atendido nas próximas ${CONTACT_ESCALATION_HOURS} horas, ` +
      `o contacto será atribuído automaticamente a outro consultor (2.º aviso).\n\n` +
      `Atenda o quanto antes para manter o contacto consigo.\n\n— HousePro`,
  };
}

/** Email ao cliente: justificação da reatribuição, com opção de manter o consultor. */
export function clientReassignMessage(opts: {
  clientName: string;
  oldAgentName: string;
  newAgentName: string;
  keepUrl?: string;
}) {
  const { clientName, oldAgentName, newAgentName, keepUrl } = opts;
  return {
    subject: "HousePro — o seu novo consultor imobiliário",
    text:
      `Caro(a) ${clientName},\n\n` +
      `Detetámos que não foi contactado(a) no período máximo de 48 horas e, por essa razão, ` +
      `foi-lhe atribuído outro consultor imobiliário (${newAgentName}), para que seja atendido(a) ` +
      `com a brevidade que merece.\n\n` +
      `Caso não concorde, responda a este email a solicitar que se mantenha o mesmo consultor ` +
      `(${oldAgentName}) até ser atendido(a).` +
      (keepUrl ? `\nEm alternativa, pode mantê-lo com um clique: ${keepUrl}` : "") +
      `\n\nCom os melhores cumprimentos,\nEquipa de Qualidade HousePro`,
  };
}
