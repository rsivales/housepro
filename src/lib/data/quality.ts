/**
 * Módulo Qualidade — livro-razão de reputação do consultor com ESCADA DE
 * ESCALONAMENTO (do mais leve ao mais sério):
 *
 *   1. Fila de análise (portal) — tudo o que o cliente submete entra como
 *      "pendente" e é ANALISADO pela Qualidade. Nunca pune automaticamente.
 *   2. Reparo de qualidade — degrau pedagógico (0 pts, 0 €). Ex.: espera
 *      demasiado longa, pequena reclamação. Notifica o consultor para corrigir.
 *   3. Reincidência → Infração — 2+ reparos da mesma categoria (janela) fazem a
 *      Qualidade propor uma infração, com devido processo (proposta →
 *      contestação → confirmação/anulação). Só a confirmada aplica pontos + €.
 *   4. Abandono de contacto — consequência específica: reatribuição a um colega
 *      com aviso prévio e 10% residual se fechar (vs 25% de referência normal).
 *
 * MÉRITOS somam reputação; INFRAÇÕES confirmadas descontam pontos e geram uma
 * penalização monetária que compensa no próximo acerto de comissão.
 */

export type QualitySeverity = "leve" | "media" | "grave";

export const SEVERITY: Record<QualitySeverity, { label: string; points: number; amount: number; badge: string }> = {
  leve: { label: "Leve", points: 20, amount: 0, badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  media: { label: "Média", points: 50, amount: 100, badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  grave: { label: "Grave", points: 150, amount: 500, badge: "bg-destructive/15 text-destructive" },
};

export type QualityCategory =
  | "procedimento"
  | "documental"
  | "atraso"
  | "etica"
  | "reclamacao"
  | "abandono";

export const CATEGORY_LABEL: Record<QualityCategory, string> = {
  procedimento: "Incumprimento de procedimento",
  documental: "Falha documental",
  atraso: "Atraso / prazo",
  etica: "Falha de ética",
  reclamacao: "Reclamação de cliente",
  abandono: "Abandono de contacto",
};

export type QualityKind = "merito" | "reparo" | "infracao";

/** Origem do registo (para auditoria e para saber o que veio do portal). */
export type QualityOrigin = "manual" | "checklist" | "portal";

/**
 * Estados. Um reparo/portal usa {pendente, ativo, resolvido, arquivada};
 * uma infração usa o devido processo {proposta, contestada, confirmada, anulada}.
 */
export type QualityStatus =
  | "pendente" // portal: na fila de análise da Qualidade
  | "ativo" // reparo em aberto (a corrigir)
  | "resolvido" // reparo corrigido
  | "arquivada" // descartado após análise
  | "proposta"
  | "contestada"
  | "confirmada"
  | "anulada";

export const STATUS_LABEL: Record<QualityStatus, { label: string; badge: string }> = {
  pendente: { label: "Na fila", badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ativo: { label: "Em aberto", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  resolvido: { label: "Resolvido", badge: "bg-primary/15 text-primary" },
  arquivada: { label: "Arquivado", badge: "bg-secondary text-muted-foreground" },
  proposta: { label: "Proposta", badge: "bg-secondary text-foreground" },
  contestada: { label: "Contestada", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  confirmada: { label: "Confirmada", badge: "bg-destructive/15 text-destructive" },
  anulada: { label: "Anulada", badge: "bg-primary/15 text-primary" },
};

export const KIND_LABEL: Record<QualityKind, string> = {
  merito: "Mérito",
  reparo: "Reparo de qualidade",
  infracao: "Infração",
};

/** Referência (25%) vs residual de abandono (10%). */
export const REFERRAL_STANDARD_PCT = 25;
export const ABANDONO_RESIDUAL_PCT = 10;

/** Janela e limiar de reincidência de reparos → sugestão de infração. */
export const REPARO_WINDOW_DAYS = 90;
export const REPARO_ESCALATION_THRESHOLD = 2;

export interface QualityEvent {
  id: string;
  kind: QualityKind;
  agentId: string;
  category?: QualityCategory;
  severity?: QualitySeverity;
  /** Pontos (positivos p/ mérito, negativos p/ infração confirmada; 0 p/ reparo). */
  points: number;
  /** Penalização monetária (€) — só infrações confirmadas. */
  amount: number;
  reason: string;
  status?: QualityStatus;
  origin?: QualityOrigin;
  /** Quem submeteu (ex.: nome do cliente, no caso do portal). */
  submittedBy?: string;
  contestNote?: string;
  /** Consequência de abandono: colega para quem o contacto foi reatribuído. */
  reassignedTo?: string;
  residualPct?: number;
  createdAt: string;
}

/** Eventos demo (à volta do consultor "rui"). */
export const demoQualityEvents: QualityEvent[] = [
  { id: "q1", kind: "merito", agentId: "rui", points: 40, amount: 0, reason: "Avaliação 5 estrelas de um cliente", createdAt: "2026-07-22" },
  { id: "q2", kind: "merito", agentId: "rui", points: 60, amount: 0, reason: "Angariação exclusiva angariada", createdAt: "2026-07-15" },
  { id: "q5", kind: "reparo", agentId: "rui", category: "atraso", points: 0, amount: 0, reason: "Cliente reportou espera longa por resposta", status: "ativo", origin: "portal", submittedBy: "Cliente (portal)", createdAt: "2026-07-25" },
  { id: "q6", kind: "reparo", agentId: "rui", category: "reclamacao", points: 0, amount: 0, reason: "Visita remarcada em cima da hora", status: "resolvido", origin: "portal", createdAt: "2026-06-18" },
  { id: "q7", kind: "reparo", agentId: "rui", category: "atraso", points: 0, amount: 0, reason: "Sem retorno de chamada em 48h (portal)", status: "pendente", origin: "portal", submittedBy: "Ana (cliente)", createdAt: "2026-07-28" },
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
  /** Reparos em aberto (a corrigir). */
  openReparos: number;
  /** Submissões do portal por analisar. */
  queue: number;
}

export function qualityScore(events: QualityEvent[], meritBase = 0): QualityScore {
  let merits = meritBase;
  let penaltiesPoints = 0;
  let moneyDue = 0;
  let pending = 0;
  let openReparos = 0;
  let queue = 0;
  for (const e of events) {
    if (e.status === "pendente") { queue += 1; continue; }
    if (e.kind === "merito") merits += e.points;
    else if (e.kind === "reparo") {
      if (e.status === "ativo") openReparos += 1;
    } else if (e.kind === "infracao") {
      if (e.status === "confirmada") {
        penaltiesPoints += Math.abs(e.points);
        moneyDue += e.amount;
      }
      if (e.status === "proposta" || e.status === "contestada") pending += 1;
    }
  }
  return { merits, penaltiesPoints, net: merits - penaltiesPoints, moneyDue, pending, openReparos, queue };
}

export interface Escalation {
  reparos: number;
  suggestInfraction: boolean;
  suggestReassign: boolean;
}

/**
 * Avalia a reincidência de reparos de uma categoria numa janela recente e
 * sugere o próximo degrau: propor infração (reincidência) e/ou reatribuir o
 * contacto (abandono).
 */
export function escalation(
  events: QualityEvent[],
  agentId: string,
  category: QualityCategory,
  now = new Date()
): Escalation {
  const since = new Date(now.getTime() - REPARO_WINDOW_DAYS * 864e5);
  const reparos = events.filter(
    (e) =>
      e.agentId === agentId &&
      e.kind === "reparo" &&
      e.category === category &&
      e.status !== "arquivada" &&
      new Date(e.createdAt) >= since
  ).length;
  return {
    reparos,
    suggestInfraction: reparos >= REPARO_ESCALATION_THRESHOLD,
    suggestReassign: category === "abandono" || (category === "atraso" && reparos >= REPARO_ESCALATION_THRESHOLD),
  };
}
