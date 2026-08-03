/**
 * Referências para serviços — contactos que o consultor encaminha para parceiros
 * (crédito, construção, jurídico, certificados…) a troco de uma referência.
 * O consultor mantém a noção do que passou, a quem, com que % e como evolui.
 */

export type ServiceCategory =
  | "credito"
  | "construcao"
  | "juridico"
  | "energetico"
  | "seguros"
  | "mudancas"
  | "outro";

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "credito", label: "Crédito habitação" },
  { value: "construcao", label: "Construção / remodelação" },
  { value: "juridico", label: "Serviços jurídicos" },
  { value: "energetico", label: "Certificado energético" },
  { value: "seguros", label: "Seguros" },
  { value: "mudancas", label: "Mudanças" },
  { value: "outro", label: "Outro" },
];

export const serviceCategoryLabel = (v: ServiceCategory): string =>
  SERVICE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export type ServiceStatus = "enviado" | "em_contacto" | "em_curso" | "concluido" | "sem_sucesso";

export const SERVICE_STATUS: Record<ServiceStatus, { label: string; badge: string }> = {
  enviado: { label: "Enviado", badge: "bg-secondary text-foreground" },
  em_contacto: { label: "Em contacto", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  em_curso: { label: "Em curso", badge: "bg-gold/15 text-foreground" },
  concluido: { label: "Concluído", badge: "bg-primary/15 text-primary" },
  sem_sucesso: { label: "Sem sucesso", badge: "bg-destructive/15 text-destructive" },
};

export const SERVICE_STATUS_ORDER: ServiceStatus[] = [
  "enviado",
  "em_contacto",
  "em_curso",
  "concluido",
  "sem_sucesso",
];

export interface ServiceReferral {
  id: string;
  category: ServiceCategory;
  /** Cliente encaminhado. */
  clientName: string;
  clientContact?: string;
  /** Profissional/parceiro responsável por tratar do cliente. */
  partnerName: string;
  partnerContact?: string;
  /** Referência acordada: % da faturação do serviço ou valor fixo (€). */
  feeType: "percent" | "fixed";
  feePct?: number;
  feeFixed?: number;
  status: ServiceStatus;
  /** Feedback do cliente sobre o serviço. */
  feedback?: string;
  note?: string;
  createdAt: string;
}

/** Exemplos (modo demo). */
export const demoServiceReferrals: ServiceReferral[] = [
  {
    id: "sr-1",
    category: "credito",
    clientName: "Helena Dias",
    clientContact: "351962111222",
    partnerName: "CréditoCasa · Nuno Pinto",
    partnerContact: "351913000111",
    feeType: "percent",
    feePct: 15,
    status: "em_curso",
    feedback: "Muito satisfeita com a simulação apresentada.",
    createdAt: "2026-07-18T10:00:00",
  },
  {
    id: "sr-2",
    category: "juridico",
    clientName: "Family Oliveira",
    partnerName: "Dr.ª Sofia Ramos (advogada)",
    partnerContact: "351915222333",
    feeType: "fixed",
    feeFixed: 250,
    status: "concluido",
    feedback: "CPCV tratado sem problemas.",
    createdAt: "2026-07-10T09:30:00",
  },
  {
    id: "sr-3",
    category: "energetico",
    clientName: "Pedro Nunes",
    clientContact: "351919777888",
    partnerName: "CertEnergia",
    feeType: "fixed",
    feeFixed: 30,
    status: "enviado",
    createdAt: "2026-07-22T14:00:00",
  },
];
