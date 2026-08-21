import type { RoleKey } from "./types";

/** Módulo de permissões — quem vê o quê e quem aprova, por hierarquia. */

export interface Capability {
  key: string;
  label: string;
}

export const CAPABILITIES: Capability[] = [
  { key: "view_commissions", label: "Ver comissões" },
  { key: "approve_publications", label: "Aprovar publicações" },
  { key: "commission_exceptions", label: "Autorizar exceções de comissão" },
  { key: "approve_teams", label: "Aprovar equipas/parcerias" },
  { key: "view_client_data", label: "Ver dados de clientes/leads" },
  { key: "manage_exports", label: "Gerir APIs de exportação" },
  { key: "manage_permissions", label: "Gerir permissões" },
  { key: "view_all_agencies", label: "Ver todas as agências" },
  // Helix (F6): módulos X e recrutamento.
  { key: "manage_campaigns", label: "Gerir campanhas (Meta / X Campaigns)" },
  { key: "manage_market", label: "Gerir o X Market (catálogo/preços)" },
  { key: "approve_expenses", label: "Aprovar despesas / encomendas" },
  { key: "access_recruitment", label: "Aceder ao recrutamento" },
  { key: "view_reporting", label: "Ver relatórios/observabilidade" },
];

export const ROLE_LABEL: Record<RoleKey, string> = {
  superadmin: "Super Admin (supervisão global)",
  admin: "Administração (marca / global)",
  diretor: "Diretor de agência (broker)",
  coordenador: "Coordenação / gestor de equipa",
  marketing: "Responsável de marketing",
  recrutamento: "Recrutamento",
  apoio: "Apoio administrativo",
  agente: "Agente",
  agente_ami: "Agente com AMI próprio",
  advogado: "Advogado (LegalFlow)",
  parceiro: "Parceiro / fornecedor",
};

export const ROLE_ORDER: RoleKey[] = [
  "superadmin",
  "admin",
  "diretor",
  "coordenador",
  "marketing",
  "recrutamento",
  "apoio",
  "advogado",
  "agente_ami",
  "agente",
  "parceiro",
];

/** Todas a falso — base para compor cada papel sem esquecer capacidades. */
const NONE: Record<string, boolean> = Object.fromEntries(CAPABILITIES.map((c) => [c.key, false]));

/** Matriz de capacidades por papel. */
export const ROLE_CAPS: Record<RoleKey, Record<string, boolean>> = {
  superadmin: {
    // Super Admin — supervisiona e modela todo o sistema; acesso total.
    ...NONE,
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: true,
    approve_teams: true,
    view_client_data: true,
    manage_exports: true,
    manage_permissions: true,
    view_all_agencies: true,
    manage_campaigns: true,
    manage_market: true,
    approve_expenses: true,
    access_recruitment: true,
    view_reporting: true,
  },
  admin: {
    ...NONE,
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: true,
    approve_teams: true,
    view_client_data: true,
    manage_exports: true,
    manage_permissions: true,
    view_all_agencies: true, // marca: várias agências
    manage_campaigns: true,
    manage_market: true,
    approve_expenses: true,
    access_recruitment: true,
    view_reporting: true,
  },
  diretor: {
    // Broker / diretor de agência — gere UMA agência.
    ...NONE,
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: true,
    approve_teams: true,
    view_client_data: true,
    manage_exports: true,
    manage_permissions: true,
    view_all_agencies: false,
    manage_campaigns: true,
    approve_expenses: true,
    access_recruitment: true,
    view_reporting: true,
  },
  coordenador: {
    ...NONE,
    view_commissions: true,
    approve_publications: true,
    view_client_data: true,
    manage_campaigns: true,
    approve_expenses: true, // aprova despesas da sua equipa
    view_reporting: true,
  },
  marketing: {
    // Responsável de marketing — gere campanhas e comunicações, não comissões.
    ...NONE,
    view_client_data: true,
    manage_campaigns: true,
    view_reporting: true,
  },
  recrutamento: {
    // Recrutamento — acesso SEPARADO do comercial.
    ...NONE,
    access_recruitment: true,
  },
  apoio: {
    // Apoio administrativo — dados de clientes e encomendas, sem comissões.
    ...NONE,
    view_client_data: true,
  },
  agente_ami: {
    ...NONE,
    view_commissions: true,
    approve_publications: true, // publica sem aprovação da marca (AMI próprio)
    view_client_data: true,
  },
  agente: {
    ...NONE,
    view_commissions: true,
    view_client_data: true,
  },
  advogado: {
    // Advogado (LegalFlow): trata dos documentos legais; não vê comissões.
    ...NONE,
    view_client_data: true,
  },
  parceiro: {
    // Parceiro/fornecedor — acesso muito limitado (ex.: as suas encomendas).
    ...NONE,
  },
};

export function can(role: RoleKey | undefined, cap: string): boolean {
  if (!role) return false;
  return Boolean(ROLE_CAPS[role]?.[cap]);
}

/** Um imóvel precisa de aprovação da administração? (Agentes com AMI próprio
 *  publicam sob a sua responsabilidade e ficam isentos.) */
export function needsApproval(agentOwnAMI?: boolean): boolean {
  return !agentOwnAMI;
}
