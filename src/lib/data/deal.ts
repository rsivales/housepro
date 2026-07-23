export type DealStage =
  | "proposta_enviada"
  | "proposta_aceite"
  | "reserva"
  | "cpcv"
  | "escritura"
  | "concluido"
  | "cancelado";

export type CreditStage =
  | "sem_credito"
  | "pedido"
  | "aprovacao"
  | "avaliacao"
  | "escritura_marcada";

/** Transactional track, in order (cancelado is excluded from the stepper). */
export const DEAL_STEPS: { stage: DealStage; label: string; hint: string }[] = [
  { stage: "proposta_enviada", label: "Proposta enviada", hint: "Proposta submetida ao vendedor." },
  { stage: "proposta_aceite", label: "Proposta aceite", hint: "Acordo alcançado — avançar para reserva." },
  { stage: "reserva", label: "Reserva", hint: "Recolha de informação e documentos; sinal de reserva." },
  { stage: "cpcv", label: "CPCV", hint: "Contrato-promessa de compra e venda assinado." },
  { stage: "escritura", label: "Escritura", hint: "Marcação e assinatura da escritura." },
  { stage: "concluido", label: "Concluído", hint: "Negócio fechado." },
];

/** Parallel banking/credit track. */
export const CREDIT_STEPS: { stage: CreditStage; label: string }[] = [
  { stage: "pedido", label: "Pedido" },
  { stage: "aprovacao", label: "Aprovação" },
  { stage: "avaliacao", label: "Avaliação" },
  { stage: "escritura_marcada", label: "Escritura marcada" },
];

export function stagePercent(stage: DealStage): number {
  return (
    {
      proposta_enviada: 10,
      proposta_aceite: 30,
      reserva: 50,
      cpcv: 75,
      escritura: 95,
      concluido: 100,
      cancelado: 0,
    } as Record<DealStage, number>
  )[stage];
}

export interface Deal {
  id: string;
  reference: string;
  propertyTitle: string;
  location: string;
  amount: number;
  stage: DealStage;
  creditStage: CreditStage;
  buyerName: string;
  sellerName: string;
  /** agent ids */
  angariadorId: string;
  consultorCompradorId: string;
  coordenadorId: string;
  updatedAt: string;
}

/** Demo transaction used to preview the process infographic (M2/M8). */
export const demoDeals: Deal[] = [
  {
    id: "d1",
    reference: "NEG-2041",
    propertyTitle: "Apartamento renovado no coração da Baixa",
    location: "Cedofeita, Porto",
    amount: 415000,
    stage: "cpcv",
    creditStage: "avaliacao",
    buyerName: "João P.",
    sellerName: "Maria S.",
    angariadorId: "rui",
    consultorCompradorId: "ana",
    coordenadorId: "sofia",
    updatedAt: "2026-07-20",
  },
  {
    id: "d2",
    reference: "NEG-2042",
    propertyTitle: "Moradia de luxo com vista mar e piscina",
    location: "Olhos de Água, Albufeira",
    amount: 2850000,
    stage: "proposta_aceite",
    creditStage: "sem_credito",
    buyerName: "Família Oliveira",
    sellerName: "H. Santos",
    angariadorId: "carla",
    consultorCompradorId: "rui",
    coordenadorId: "carla",
    updatedAt: "2026-07-21",
  },
  {
    id: "d3",
    reference: "NEG-2043",
    propertyTitle: "Penthouse com rooftop privado",
    location: "Avenidas Novas, Lisboa",
    amount: 1650000,
    stage: "escritura",
    creditStage: "escritura_marcada",
    buyerName: "L. Ferreira",
    sellerName: "A. Nunes",
    angariadorId: "ana",
    consultorCompradorId: "ana",
    coordenadorId: "sofia",
    updatedAt: "2026-07-19",
  },
];

export const dealById = (id: string): Deal | undefined =>
  demoDeals.find((d) => d.id === id);
