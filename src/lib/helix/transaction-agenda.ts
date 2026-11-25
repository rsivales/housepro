import type { CreditStage, DealStage } from "@/lib/data/deal";
import type { DealTask } from "@/lib/db/deal-tasks";

export type AgendaTask = Pick<DealTask, "id" | "code" | "title" | "phase" | "status" | "applicability" | "critical" | "audience" | "dueAt" | "ownerId">;

type AgendaDeal = {
  stage: DealStage;
  creditStage: CreditStage;
  escrituraAt: string | null;
  cpcvDeadlineAt: string | null;
  managerId: string | null;
  coordinatorId: string | null;
  buyerAgentId: string | null;
  listingAgentId: string | null;
};

type Deadline = { at: string; label: string };
type Responsible = { id: string; role: string };
export type AgendaAction = {
  title: string;
  responsible: Responsible | null;
  deadline: Deadline | null;
  critical: boolean;
  detail?: string;
  taskId?: string;
};

const creditActions = {
  pedido: { title: "Confirmar pedido e acompanhar resposta do banco", task: "credito_pedido" },
  aprovacao: { title: "Confirmar aprovação e agendar avaliação bancária", task: "credito_aprovacao" },
  avaliacao: { title: "Acompanhar avaliação bancária do imóvel", task: "credito_avaliacao" },
} as const;

const proposalActions = {
  proposta_enviada: "Obter resposta à proposta",
  proposta_aceite: "Confirmar condições e preparar reserva",
} as const;

const phaseOrder = { pre_cpcv: 0, credito: 1, post_cpcv: 2, pre_escritura: 3, post_escritura: 4 };

function deadline(at: string | null, label: string): Deadline | null {
  return at && Number.isFinite(Date.parse(at)) ? { at, label } : null;
}

function dealResponsible(deal: AgendaDeal, commercial?: "credit" | "proposal"): Responsible | null {
  if (commercial === "credit" && deal.buyerAgentId) return { id: deal.buyerAgentId, role: "Consultor do comprador" };
  if (commercial === "proposal" && deal.listingAgentId) return { id: deal.listingAgentId, role: "Consultor angariador" };
  if (deal.managerId) return { id: deal.managerId, role: "Gestão processual" };
  if (deal.coordinatorId) return { id: deal.coordinatorId, role: "Coordenação" };
  if (commercial === "proposal" && deal.buyerAgentId) return { id: deal.buyerAgentId, role: "Consultor do comprador" };
  return null;
}

const lisbonDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" });

export function agendaPriority(due: Deadline | null, now: number): number {
  if (!due) return 4;
  const at = Date.parse(due.at);
  if (at < now) return 0;
  if (lisbonDay.format(at) === lisbonDay.format(now)) return 1;
  // Compare local calendar dates so the week includes the full seventh day.
  const calendarDay = (value: number) => {
    const parts = lisbonDay.formatToParts(value);
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"));
  };
  return calendarDay(at) - calendarDay(now) <= 7 * 86_400_000 ? 2 : 3;
}

export function compareAgendaActions(a: AgendaAction, b: AgendaAction, now: number): number {
  const priority = agendaPriority(a.deadline, now) - agendaPriority(b.deadline, now);
  if (priority) return priority;
  if (a.deadline && b.deadline) {
    const time = Date.parse(a.deadline.at) - Date.parse(b.deadline.at);
    if (time) return time;
  }
  return Number(b.critical) - Number(a.critical);
}

export function getAgendaAction(deal: AgendaDeal, tasks: AgendaTask[], now: number): AgendaAction {
  const proposal = deal.stage === "proposta_enviada" || deal.stage === "proposta_aceite";
  const beforeCpcv = proposal || deal.stage === "reserva";
  const cpcv = beforeCpcv ? deadline(deal.cpcvDeadlineAt, "Prazo do CPCV") : null;
  const escritura = deadline(deal.escrituraAt, "Data da escritura");
  const credit = deal.creditStage in creditActions ? creditActions[deal.creditStage as keyof typeof creditActions] : null;
  const candidates = tasks.filter((task) => {
    if (task.applicability === "not_applicable" || task.status === "validated" || task.status === "waived") return false;
    if (task.phase === "credito") return task.code === credit?.task || (!!credit && task.status !== "pending");
    if (task.code === "data_escritura_agendada" && escritura && task.status === "pending") return false;
    if (task.applicability === "optional" && task.status === "pending" && !task.ownerId && !task.dueAt) return false;
    if (task.phase === "post_escritura") return false;
    return beforeCpcv ? !proposal && task.phase === "pre_cpcv" : task.phase !== "pre_cpcv";
  }).map((task): AgendaAction & { phase: AgendaTask["phase"] } => {
    const milestone = task.phase === "pre_cpcv" ? cpcv : task.phase === "pre_escritura" ? escritura : null;
    const external = task.audience === "buyer" ? "comprador" : task.audience === "seller" ? "vendedor" : null;
    const needsReview = task.status === "received" || task.status === "in_review";
    return {
      taskId: task.id,
      phase: task.phase,
      title: needsReview ? `Validar — ${task.title}` : task.code === credit?.task && task.status === "pending" ? credit.title : task.title,
      detail: task.status === "requested" && external ? `A aguardar envio do ${external}` : task.status === "rejected" ? "A corrigir após rejeição" : undefined,
      responsible: task.ownerId ? { id: task.ownerId, role: "Responsável pela tarefa" } : dealResponsible(deal, task.phase === "credito" ? "credit" : undefined),
      deadline: task.dueAt === milestone?.at ? milestone : deadline(task.dueAt, "Prazo da tarefa") ?? milestone,
      critical: task.critical,
    };
  });

  candidates.sort((a, b) => compareAgendaActions(a, b, now) || phaseOrder[a.phase] - phaseOrder[b.phase] || a.title.localeCompare(b.title, "pt-PT"));
  const nextTask = candidates[0];

  // Surface active credit without a checklist unless a current deadline takes precedence.
  const nextDeadline = nextTask?.deadline ?? cpcv ?? escritura;
  if (credit && agendaPriority(nextDeadline, now) > 2 && nextTask?.phase !== "credito") {
    return { title: credit.title, responsible: dealResponsible(deal, "credit"), deadline: null, critical: false };
  }
  if (nextTask) return nextTask;

  if (deal.stage === "proposta_enviada" || deal.stage === "proposta_aceite") {
    return { title: proposalActions[deal.stage], responsible: dealResponsible(deal, "proposal"), deadline: cpcv, critical: false };
  }
  if (beforeCpcv) {
    return { title: "Preparar o CPCV", responsible: dealResponsible(deal), deadline: cpcv, critical: false };
  }
  return {
    title: escritura ? "Confirmar preparação da escritura" : "Definir data da escritura",
    responsible: dealResponsible(deal),
    deadline: escritura,
    critical: false,
  };
}
