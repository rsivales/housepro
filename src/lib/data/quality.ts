/**
 * Módulo Qualidade — livro-razão de reputação do consultor. Junta MÉRITOS
 * (pontos positivos) e INFRAÇÕES (pontos negativos + penalização monetária que
 * compensa na comissão). Com devido processo: uma infração é PROPOSTA, o agente
 * pode CONTESTAR, e a coordenação/direção CONFIRMA ou ANULA. Só a infração
 * confirmada aplica pontos e dinheiro.
 */

export type QualitySeverity = "leve" | "media" | "grave";

export const SEVERITY: Record<QualitySeverity, { label: string; points: number; amount: number; badge: string }> = {
  leve: { label: "Leve", points: 20, amount: 0, badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  media: { label: "Média", points: 50, amount: 100, badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  grave: { label: "Grave", points: 150, amount: 500, badge: "bg-destructive/15 text-destructive" },
};

export type QualityCategory = "procedimento" | "documental" | "atraso" | "etica" | "reclamacao";

export const CATEGORY_LABEL: Record<QualityCategory, string> = {
  procedimento: "Incumprimento de procedimento",
  documental: "Falha documental",
  atraso: "Atraso / prazo",
  etica: "Falha de ética",
  reclamacao: "Reclamação de cliente",
};

export type QualityStatus = "proposta" | "contestada" | "confirmada" | "anulada";

export const STATUS_LABEL: Record<QualityStatus, { label: string; badge: string }> = {
  proposta: { label: "Proposta", badge: "bg-secondary text-foreground" },
  contestada: { label: "Contestada", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  confirmada: { label: "Confirmada", badge: "bg-destructive/15 text-destructive" },
  anulada: { label: "Anulada", badge: "bg-primary/15 text-primary" },
};

export interface QualityEvent {
  id: string;
  kind: "merito" | "infracao";
  agentId: string;
  category?: QualityCategory;
  severity?: QualitySeverity;
  /** Pontos (positivos p/ mérito, negativos p/ infração confirmada). */
  points: number;
  /** Penalização monetária (€) — só infrações confirmadas. */
  amount: number;
  reason: string;
  status?: QualityStatus; // só infrações
  contestNote?: string;
  createdAt: string;
}

/** Eventos demo (à volta do consultor "rui"). */
export const demoQualityEvents: QualityEvent[] = [
  { id: "q1", kind: "merito", agentId: "rui", points: 40, amount: 0, reason: "Avaliação 5 estrelas de um cliente", createdAt: "2026-07-22" },
  { id: "q2", kind: "merito", agentId: "rui", points: 60, amount: 0, reason: "Angariação exclusiva angariada", createdAt: "2026-07-15" },
  { id: "q3", kind: "infracao", agentId: "rui", category: "atraso", severity: "leve", points: -20, amount: 0, reason: "Documento entregue fora do prazo", status: "proposta", createdAt: "2026-07-24" },
  { id: "q4", kind: "infracao", agentId: "rui", category: "documental", severity: "media", points: -50, amount: 100, reason: "Certificado energético em falta na escritura", status: "confirmada", createdAt: "2026-06-30" },
];

export interface QualityScore {
  /** Base de méritos (pontos positivos + gamificação). */
  merits: number;
  /** Pontos perdidos por infrações confirmadas. */
  penaltiesPoints: number;
  /** Total líquido de reputação. */
  net: number;
  /** Penalização monetária confirmada por saldar (€). */
  moneyDue: number;
  /** Infrações à espera de resposta/decisão. */
  pending: number;
}

export function qualityScore(events: QualityEvent[], meritBase = 0): QualityScore {
  let merits = meritBase;
  let penaltiesPoints = 0;
  let moneyDue = 0;
  let pending = 0;
  for (const e of events) {
    if (e.kind === "merito") merits += e.points;
    else if (e.status === "confirmada") {
      penaltiesPoints += Math.abs(e.points);
      moneyDue += e.amount;
    }
    if (e.kind === "infracao" && (e.status === "proposta" || e.status === "contestada")) pending += 1;
  }
  return { merits, penaltiesPoints, net: merits - penaltiesPoints, moneyDue, pending };
}
