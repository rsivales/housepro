/**
 * Histórico de rastreio (audit trail) dos imóveis — quem fez cada alteração e
 * quando. Cada edição regista o autor, a data e os campos alterados (de → para),
 * para total transparência e responsabilização.
 */

export interface AuditChange {
  field: string;
  from?: string;
  to?: string;
}

export interface AuditEntry {
  id: string;
  propertyId: string;
  propertyRef?: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  /** criou | editou | estado | aprovou */
  action: string;
  changes?: AuditChange[];
  at: string;
}

export const AUDIT_FIELD_LABEL: Record<string, string> = {
  title: "Título",
  price: "Preço",
  typology: "Tipologia",
  beds: "Quartos",
  baths: "Casas de banho",
  area: "Área",
  status: "Estado",
  shortDescription: "Resumo",
  description: "Descrição",
  commissionPct: "Comissão (%)",
  commissionFixed: "Comissão (€)",
  operation: "Operação",
};

export function auditFieldLabel(f: string): string {
  return AUDIT_FIELD_LABEL[f] ?? f;
}

/** Histórico de exemplo (modo demo). */
export function demoAudit(propertyId: string): AuditEntry[] {
  return [
    {
      id: "au2", propertyId, actorId: "carla", actorName: "Carla Sousa", actorRole: "Diretora de agência",
      action: "editou", changes: [{ field: "price", from: "3 100 000 €", to: "2 950 000 €" }],
      at: "2026-07-28T11:15:00",
    },
    {
      id: "au1", propertyId, actorId: "carla", actorName: "Carla Sousa", actorRole: "Diretora de agência",
      action: "criou", at: "2026-07-20T09:40:00",
    },
  ];
}
