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
];

export const ROLE_LABEL: Record<RoleKey, string> = {
  admin: "Administração (marca / global)",
  diretor: "Diretor de agência (broker)",
  coordenador: "Coordenação (equipa)",
  agente: "Agente",
  agente_ami: "Agente com AMI próprio",
};

export const ROLE_ORDER: RoleKey[] = ["admin", "diretor", "coordenador", "agente_ami", "agente"];

/** Matriz de capacidades por papel. */
export const ROLE_CAPS: Record<RoleKey, Record<string, boolean>> = {
  admin: {
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: true,
    approve_teams: true,
    view_client_data: true,
    manage_exports: true,
    manage_permissions: true,
    view_all_agencies: true, // marca: várias agências
  },
  diretor: {
    // Broker / diretor de agência — gere UMA agência.
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: true,
    approve_teams: true,
    view_client_data: true,
    manage_exports: true,
    manage_permissions: true,
    view_all_agencies: false,
  },
  coordenador: {
    view_commissions: true,
    approve_publications: true,
    commission_exceptions: false,
    approve_teams: false,
    view_client_data: true,
    manage_exports: false,
    manage_permissions: false,
    view_all_agencies: false, // apenas a sua equipa
  },
  agente_ami: {
    view_commissions: true,
    approve_publications: true, // publica sem aprovação da marca (AMI próprio)
    commission_exceptions: false,
    approve_teams: false,
    view_client_data: true,
    manage_exports: false,
    manage_permissions: false,
    view_all_agencies: false,
  },
  agente: {
    view_commissions: true,
    approve_publications: false,
    commission_exceptions: false,
    approve_teams: false,
    view_client_data: true,
    manage_exports: false,
    manage_permissions: false,
    view_all_agencies: false,
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
