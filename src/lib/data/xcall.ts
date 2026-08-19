/**
 * X Call — chamadas assistidas.
 *
 * O nome do módulo é sempre "X Call". Este ficheiro define os guiões de chamada,
 * os resultados possíveis e o registo de chamada (CallLog). A arquitetura fica
 * preparada para telefonia (VoIP/gravação/transcrição) SEM ligar serviços pagos:
 * o MVP abre o marcador via `tel:` e captura o resultado à mão.
 */

// ── Guiões de chamada ────────────────────────────────────────────────────────

export type CallScriptKey =
  | "comprador"
  | "proprietario"
  | "arrendamento"
  | "investimento"
  | "recrutamento"
  | "seguimento_visita"
  | "proposta"
  | "reativacao"
  | "lead_fria"
  | "pedido_documentacao";

export interface CallScript {
  key: CallScriptKey;
  label: string;
  /** Objetivo da chamada (o que se quer alcançar). */
  objective: string;
  /** Abertura sugerida. */
  opening: string;
  /** Perguntas essenciais a fazer. */
  questions: string[];
}

export const CALL_SCRIPTS: CallScript[] = [
  {
    key: "comprador",
    label: "Comprador",
    objective: "Qualificar a procura e marcar visita.",
    opening: "Olá {nome}, fala {consultor} da HousePro. Recebi o seu interesse — tem 2 minutos?",
    questions: [
      "Que zona(s) procura?",
      "Tipologia e nº de quartos?",
      "Orçamento e tem financiamento tratado?",
      "Prazo para mudar de casa?",
      "Tem imóvel para vender antes de comprar?",
    ],
  },
  {
    key: "proprietario",
    label: "Proprietário",
    objective: "Marcar avaliação e apresentar o serviço de angariação.",
    opening: "Olá {nome}, fala {consultor} da HousePro. Recebi o seu pedido sobre vender o imóvel.",
    questions: [
      "Qual é o imóvel e a localização?",
      "Porquê e para quando quer vender?",
      "Tem uma expectativa de valor?",
      "Está com mais alguma agência?",
      "Quando podemos fazer a avaliação?",
    ],
  },
  {
    key: "arrendamento",
    label: "Arrendamento",
    objective: "Perceber necessidade e condições de arrendamento.",
    opening: "Olá {nome}, fala {consultor} da HousePro sobre o arrendamento.",
    questions: ["Zona e tipologia?", "Orçamento mensal?", "Prazo pretendido?", "Fiador/recibos?", "Quando quer visitar?"],
  },
  {
    key: "investimento",
    label: "Investimento",
    objective: "Perceber perfil e objetivo de rentabilidade.",
    opening: "Olá {nome}, fala {consultor} da HousePro sobre oportunidades de investimento.",
    questions: ["Capital disponível?", "Rentabilidade alvo?", "Prefere arrendamento ou revenda?", "Zonas de interesse?", "Horizonte temporal?"],
  },
  {
    key: "recrutamento",
    label: "Recrutamento",
    objective: "Avaliar interesse e marcar entrevista.",
    opening: "Olá {nome}, fala {consultor} da HousePro. Recebemos a sua candidatura.",
    questions: ["Experiência no imobiliário?", "Porquê a HousePro?", "Disponibilidade?", "Expectativa de rendimento?", "Quando podemos entrevistar?"],
  },
  {
    key: "seguimento_visita",
    label: "Seguimento de visita",
    objective: "Recolher feedback e avançar para proposta.",
    opening: "Olá {nome}, fala {consultor}. Queria saber a sua opinião sobre a visita.",
    questions: ["O que achou do imóvel?", "Corresponde ao que procura?", "Alguma dúvida ou objeção?", "Faz sentido apresentar proposta?"],
  },
  {
    key: "proposta",
    label: "Proposta",
    objective: "Fechar condições e apresentar/negociar proposta.",
    opening: "Olá {nome}, fala {consultor}. Tenho novidades sobre a sua proposta.",
    questions: ["Confirma o valor?", "Condições de pagamento?", "Prazo de escritura?", "Alguma condição especial?"],
  },
  {
    key: "reativacao",
    label: "Reativação",
    objective: "Reativar um contacto adormecido.",
    opening: "Olá {nome}, fala {consultor} da HousePro. Há algum tempo que não falávamos.",
    questions: ["Ainda procura/vende?", "Mudou alguma coisa?", "Quer que retome a procura?"],
  },
  {
    key: "lead_fria",
    label: "Lead fria",
    objective: "Requalificar uma lead sem resposta.",
    opening: "Olá {nome}, fala {consultor} da HousePro. Tentei contactá-lo antes.",
    questions: ["Ainda tem interesse?", "Qual o melhor horário para falar?", "Prefere email/WhatsApp?"],
  },
  {
    key: "pedido_documentacao",
    label: "Pedido de documentação",
    objective: "Recolher documentos em falta.",
    opening: "Olá {nome}, fala {consultor}. Preciso de alguns documentos para avançar.",
    questions: ["Consegue enviar a caderneta predial?", "Certificado energético?", "Documento de identificação?", "Para quando?"],
  },
];

export const scriptByKey = (key: CallScriptKey): CallScript =>
  CALL_SCRIPTS.find((s) => s.key === key) ?? CALL_SCRIPTS[0];

/** Guião sugerido a partir do tipo de contacto/pipeline. */
export function suggestedScript(hint?: string): CallScriptKey {
  const h = (hint ?? "").toLowerCase();
  if (h.includes("proprietar") || h.includes("vendedor") || h.includes("angaria")) return "proprietario";
  if (h.includes("recrut")) return "recrutamento";
  if (h.includes("invest")) return "investimento";
  if (h.includes("arrend")) return "arrendamento";
  return "comprador";
}

// ── Resultado da chamada ─────────────────────────────────────────────────────

export type CallResult =
  | "atendeu"
  | "nao_atendeu"
  | "invalido"
  | "ligar_mais_tarde"
  | "qualificada"
  | "visita_marcada"
  | "sem_interesse"
  | "outro";

export const CALL_RESULT_LABEL: Record<CallResult, string> = {
  atendeu: "Atendeu",
  nao_atendeu: "Não atendeu",
  invalido: "Número inválido",
  ligar_mais_tarde: "Ligar mais tarde",
  qualificada: "Qualificada",
  visita_marcada: "Visita marcada",
  sem_interesse: "Sem interesse",
  outro: "Outro",
};

export type CallTemperature = "quente" | "morna" | "fria";

// ── Registo de chamada ───────────────────────────────────────────────────────

export interface CallLog {
  id: string;
  agentId: string;
  agentName?: string;
  contactId?: string;
  contactName?: string;
  leadId?: string;
  scriptKey: CallScriptKey;
  objective?: string;
  result: CallResult;
  temperature?: CallTemperature;
  score?: number;
  notes?: string;
  nextTaskTitle?: string;
  nextTaskDueAt?: string;
  lostReason?: string;
  createdAt: string;
  /** Preparado para telefonia futura (duração automática). */
  durationSec?: number;
}

/**
 * Mapa resultado → passo seguinte no pipeline (nome da etapa). É advisory: a
 * mudança de etapa é aplicada pelo servidor quando faz sentido. Função pura.
 */
export function stageNameForResult(result: CallResult): string | undefined {
  switch (result) {
    case "qualificada":
      return "Qualificada";
    case "visita_marcada":
      return "Visita";
    case "sem_interesse":
      return "Perdida";
    case "atendeu":
      return "Contactada";
    default:
      return undefined; // não atendeu / inválido / ligar mais tarde → sem mudança
  }
}

/** Sugere criar próxima tarefa a partir do resultado. */
export function nextTaskForResult(result: CallResult): { kind: "call" | "visit" | "followup"; title: string } | undefined {
  switch (result) {
    case "nao_atendeu":
    case "ligar_mais_tarde":
      return { kind: "call", title: "Voltar a ligar" };
    case "visita_marcada":
      return { kind: "visit", title: "Preparar visita" };
    case "qualificada":
      return { kind: "followup", title: "Enviar imóveis/proposta" };
    default:
      return undefined;
  }
}

// ── Demo ─────────────────────────────────────────────────────────────────────

export const demoCallLogs: CallLog[] = [
  {
    id: "cl-1",
    agentId: "carla",
    agentName: "Carla Sousa",
    contactId: "ct-1",
    contactName: "Helena Dias",
    leadId: "ml-1",
    scriptKey: "comprador",
    objective: "Qualificar a procura e marcar visita.",
    result: "qualificada",
    temperature: "quente",
    score: 75,
    notes: "Procura T2/T3 em Albufeira. Vai enviar documentos do crédito.",
    nextTaskTitle: "Enviar 3 imóveis a Albufeira",
    createdAt: "2026-08-15T16:30:00",
  },
  {
    id: "cl-2",
    agentId: "rui",
    agentName: "Rui Tavares",
    contactId: "ct-3",
    contactName: "Family Oliveira",
    scriptKey: "investimento",
    result: "visita_marcada",
    temperature: "quente",
    notes: "Visita marcada para 22/08 à moradia HP-1048.",
    nextTaskTitle: "Preparar visita",
    createdAt: "2026-08-18T10:00:00",
  },
];

export const callLogsByAgent = (agentId: string): CallLog[] =>
  demoCallLogs
    .filter((c) => c.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
