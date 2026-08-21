import type { Lead, LeadQualification } from "@/lib/data/leads";

/**
 * Qualificação de leads — pontuação heurística e sugestão de estado.
 *
 * A pontuação (0–100) mede a COMPLETUDE e a INTENÇÃO da lead. Não decide
 * sozinha: sugere. A qualificação final é uma ação humana (consultor/gestão),
 * registada na linha do tempo. Assim o comercial confia no critério e o módulo
 * não "desqualifica" ninguém automaticamente.
 */

export interface ScoreResult {
  score: number;
  /** Estado sugerido (advisory) — nunca aplicado automaticamente. */
  suggestion: LeadQualification;
  /** Motivos que compõem a pontuação (para transparência na UI). */
  reasons: string[];
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function scoreLead(lead: Partial<Lead>): ScoreResult {
  let score = 35; // base
  const reasons: string[] = [];

  if (lead.contact && lead.contact.trim().length >= 6) {
    score += 15;
    reasons.push("Contacto telefónico");
  }
  if (lead.email && lead.email.includes("@")) {
    score += 10;
    reasons.push("Email");
  }
  if (lead.intent === "visita") {
    score += 12;
    reasons.push("Pediu visita");
  } else if (lead.intent === "custos") {
    score += 6;
    reasons.push("Pediu valores");
  }
  if (lead.budget && lead.budget.trim()) {
    score += 12;
    reasons.push("Indicou orçamento");
  }
  if (lead.zone && lead.zone.trim()) {
    score += 8;
    reasons.push("Indicou zona");
  }
  if (lead.propertyRef && lead.propertyRef.trim()) {
    score += 6;
    reasons.push("Imóvel associado");
  }
  if (lead.message && lead.message.trim().length > 20) {
    score += 5;
    reasons.push("Mensagem detalhada");
  }

  score = clamp(score);
  const suggestion: LeadQualification =
    score >= 70 ? "qualificado" : score < 40 ? "desqualificado" : "novo";

  return { score, suggestion, reasons };
}

/** Etiqueta curta do nível de pontuação (para badges). */
export function scoreBand(score: number): { label: string; badge: string } {
  if (score >= 70) return { label: "Quente", badge: "bg-primary/15 text-primary" };
  if (score >= 40) return { label: "Morna", badge: "bg-gold/15 text-gold-foreground" };
  return { label: "Fria", badge: "bg-secondary text-muted-foreground" };
}
