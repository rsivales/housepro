/**
 * Papéis (roles) e a vista de supervisão do Super Admin.
 *
 * O Super Admin está acima da administração: supervisiona e modela todo o
 * sistema e pode "ver como" qualquer papel para analisar comportamentos,
 * relações e acessos a funcionalidades entre os diferentes roles. A escolha é
 * guardada num cookie e lida pelo getSession (em modo demo).
 */

import type { Agent, RoleKey } from "@/lib/data/types";

export const VIEW_AS_COOKIE = "hp_view_as";

export const ROLE_LABEL: Record<RoleKey, string> = {
  superadmin: "Super Admin",
  admin: "Administração",
  diretor: "Diretor de agência",
  coordenador: "Coordenação",
  agente_ami: "Consultor (AMI próprio)",
  agente: "Consultor",
  advogado: "Advogado",
};

/** Ordem hierárquica (do topo para a base) — para menus e navegação. */
export const ROLE_ORDER: RoleKey[] = ["superadmin", "admin", "diretor", "coordenador", "advogado", "agente_ami", "agente"];

export function roleLabel(role?: RoleKey): string {
  return role ? ROLE_LABEL[role] : "Consultor";
}

export function isSuperadmin(agent?: Pick<Agent, "roleKey" | "role">): boolean {
  return agent?.roleKey === "superadmin" || agent?.role === "superadmin";
}

/** Pode gerir/supervisionar (coordenação e acima). */
export function isStaff(agent?: Pick<Agent, "roleKey" | "role">): boolean {
  const r = agent?.roleKey;
  return r === "superadmin" || r === "admin" || r === "diretor" || r === "coordenador" || agent?.role === "admin";
}
