/**
 * Checklist assistido da fase de escritura & mudança — a rede de segurança do
 * fecho, do mais vital ao mais simples. Garante que nada falha na documentação,
 * na recolha de informação (cheques, valores, em nome de quem) e na mudança de
 * serviços (água, luz, transferências). Alimenta emails e alertas temporais.
 */

export type ChecklistGroup =
  | "documentacao"
  | "escritura"
  | "recolha"
  | "mudanca"
  | "pos";

export const GROUP_LABEL: Record<ChecklistGroup, string> = {
  documentacao: "Documentação",
  escritura: "Escritura",
  recolha: "Recolha de informação",
  mudanca: "Mudança & serviços",
  pos: "Pós-escritura",
};

export interface ChecklistItem {
  id: string;
  group: ChecklistGroup;
  label: string;
  /** Vital = bloqueia a escritura se falhar. */
  critical: boolean;
  done: boolean;
  /** Responsável pela tarefa. */
  responsavel?: "consultor" | "coordenacao" | "cliente" | "notario";
  /** Data-alvo (ISO) para o alerta temporal. */
  dueAt?: string;
  /** Campo de informação estruturada (ex.: cheque em nome de). */
  value?: string;
}

/** Itens por defeito, criados quando o negócio entra em escritura. */
export function defaultChecklist(): ChecklistItem[] {
  const mk = (
    group: ChecklistGroup,
    label: string,
    critical = false,
    withValue = false
  ): ChecklistItem => ({
    id: `${group}-${Math.random().toString(36).slice(2, 8)}`,
    group,
    label,
    critical,
    done: false,
    ...(withValue ? { value: "" } : {}),
  });

  return [
    // Documentação
    mk("documentacao", "Caderneta predial atualizada", true),
    mk("documentacao", "Certidão permanente do registo predial", true),
    mk("documentacao", "Certificado energético válido", true),
    mk("documentacao", "Licença de utilização", true),
    mk("documentacao", "Distrate / cancelamento de hipoteca", false),
    mk("documentacao", "IMI e condomínio sem dívidas", false),
    // Escritura
    mk("escritura", "Data e hora da escritura agendadas", true, true),
    mk("escritura", "Cartório / notário confirmado", true, true),
    mk("escritura", "IMT e Imposto de Selo pagos", true),
    mk("escritura", "Minuta revista por todas as partes", false),
    // Recolha de informação (vital ao simples)
    mk("recolha", "Cheque(s) em nome de", true, true),
    mk("recolha", "Nº de cheques e respetivos valores", true, true),
    mk("recolha", "Forma de pagamento do remanescente", true, true),
    mk("recolha", "IBAN / comprovativo de transferência", false, true),
    // Mudança & serviços
    mk("mudanca", "Leituras de contadores (água/luz/gás)", false, true),
    mk("mudanca", "Água — dados para transferir/ligar", false, true),
    mk("mudanca", "Eletricidade — dados para transferir/ligar", false, true),
    mk("mudanca", "Gás / internet — titularidade", false, true),
    mk("mudanca", "Entrega de chaves", true),
    // Pós-escritura
    mk("pos", "Registo predial submetido", false),
    mk("pos", "Cópia da escritura entregue ao cliente", false),
    mk("pos", "Processo fechado no CRM", false),
  ];
}

export interface ChecklistStatus {
  total: number;
  done: number;
  criticalMissing: number;
  overdue: number;
  complete: boolean;
}

export function checklistStatus(items: ChecklistItem[], now = new Date()): ChecklistStatus {
  const done = items.filter((i) => i.done).length;
  const criticalMissing = items.filter((i) => i.critical && !i.done).length;
  const overdue = items.filter((i) => !i.done && i.dueAt && new Date(i.dueAt) < now).length;
  return {
    total: items.length,
    done,
    criticalMissing,
    overdue,
    complete: done === items.length,
  };
}
