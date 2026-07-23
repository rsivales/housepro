/** Equipas e parcerias entre agentes (aprovação por admin / diretor / broker). */

export type TeamStatus = "aprovada" | "pendente" | "rejeitada";

export interface Team {
  id: string;
  name: string;
  agencyId: string;
  /** Team leader — obrigatório numa equipa. */
  leaderId: string;
  memberIds: string[];
  status: TeamStatus;
}

export interface Partnership {
  id: string;
  /** Dois ou mais agentes; ambos têm acesso à informação partilhada. */
  agentIds: string[];
  scope: string;
  status: TeamStatus;
}

export const teams: Team[] = [
  {
    id: "t1",
    name: "Equipa Porto Centro",
    agencyId: "porto",
    leaderId: "rui",
    memberIds: ["rui"],
    status: "aprovada",
  },
  {
    id: "t2",
    name: "Equipa Algarve Prime",
    agencyId: "algarve",
    leaderId: "carla",
    memberIds: ["carla"],
    status: "pendente",
  },
];

export const partnerships: Partnership[] = [
  {
    id: "p1",
    agentIds: ["ana", "rui"],
    scope: "Co-angariação Lisboa ↔ Porto",
    status: "aprovada",
  },
  {
    id: "p2",
    agentIds: ["miguel", "carla"],
    scope: "Parceria Braga ↔ Algarve",
    status: "pendente",
  },
];
