/**
 * Observabilidade do Helix — um retrato de saúde operacional que junta sinais
 * de todos os módulos (Meta, X Call, X Campaigns, X Market) para a gestão ver
 * o que precisa de atenção. Função pura sobre contagens já calculadas, testável.
 */

export type Severity = "ok" | "warn" | "crit";

export interface HealthPanel {
  key: string;
  label: string;
  value: number | string;
  severity: Severity;
  hint?: string;
  href?: string;
}

export interface HealthInput {
  metaConnected: boolean;
  unassignedLeads: number;
  slaOverdue: number;
  unmappedFields: number;
  pendingApprovals: number;
  lowCredits: number;
  callsToday: number;
  emailsSandbox: number;
}

const sev = (n: number, warn: number, crit: number): Severity =>
  n >= crit ? "crit" : n >= warn ? "warn" : "ok";

export function buildHealthSnapshot(i: HealthInput): HealthPanel[] {
  return [
    {
      key: "meta",
      label: "Integração Meta",
      value: i.metaConnected ? "Ligada" : "Demo",
      severity: i.metaConnected ? "ok" : "warn",
      hint: i.metaConnected ? undefined : "Sem conta Meta ligada (modo demonstração).",
      href: "/app/meta",
    },
    {
      key: "unassigned",
      label: "Leads sem responsável",
      value: i.unassignedLeads,
      severity: sev(i.unassignedLeads, 1, 5),
      href: "/app/meta/inbox",
    },
    {
      key: "sla",
      label: "SLA de 1.º contacto em atraso",
      value: i.slaOverdue,
      severity: sev(i.slaOverdue, 1, 3),
      href: "/app/meta/relatorios",
    },
    {
      key: "unmapped",
      label: "Campos de formulário por mapear",
      value: i.unmappedFields,
      severity: sev(i.unmappedFields, 1, 5),
      href: "/app/meta/formularios",
    },
    {
      key: "approvals",
      label: "Encomendas por aprovar",
      value: i.pendingApprovals,
      severity: sev(i.pendingApprovals, 1, 5),
      href: "/app/x-market",
    },
    {
      key: "credits",
      label: "Créditos em alerta",
      value: i.lowCredits,
      severity: sev(i.lowCredits, 1, 3),
      href: "/app/x-market",
    },
    {
      key: "calls",
      label: "Chamadas hoje",
      value: i.callsToday,
      severity: "ok",
      href: "/app/x-call",
    },
    {
      key: "emails",
      label: "Campanhas em sandbox",
      value: i.emailsSandbox,
      severity: "ok",
      href: "/app/x-campaigns",
    },
  ];
}

/** Resumo de severidade (para o topo do painel). */
export function worstSeverity(panels: HealthPanel[]): Severity {
  if (panels.some((p) => p.severity === "crit")) return "crit";
  if (panels.some((p) => p.severity === "warn")) return "warn";
  return "ok";
}
