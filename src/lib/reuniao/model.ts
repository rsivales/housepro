import {
  computeComprador,
  computeInvestidor,
  computeVendedor,
  type CalcLine,
} from "./calc";
import { propertyById } from "@/lib/data/mock";

export type ReuniaoType = "comprador" | "vendedor" | "investidor";
export type ReuniaoStatus = "rascunho" | "apresentada" | "concluida";

export const TYPE_LABEL: Record<ReuniaoType, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  investidor: "Investidor",
};

export interface Field {
  key: string;
  label: string;
  kind: "money" | "percent" | "number" | "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
  /** Text field shown in the client presentation "resumo". */
  resumo?: boolean;
  hint?: string;
}

export interface ReuniaoOutcome {
  resultado: string;
  objecoes: string;
  interesse: "" | "alto" | "medio" | "baixo";
  proximaAcao: string;
}

/** Imóvel externo adicionado por link (ex.: portal ou site de outra agência). */
export interface ExternalProperty {
  id: string;
  url: string;
  title: string;
  price: number;
  image: string;
  location: string;
  typology?: string;
  area?: number;
}

/** Imóvel para mostrar no dossier (interno ou externo, normalizado). */
export interface DisplayProperty {
  key: string;
  title: string;
  price: number;
  image: string;
  location: string;
  typology?: string;
  area?: number;
  reference: string;
  external: boolean;
}

export interface Reuniao {
  id: string;
  type: ReuniaoType;
  status: ReuniaoStatus;
  clientName: string;
  clientContact: string;
  consultantId: string;
  propertyIds: string[];
  externalProperties?: ExternalProperty[];
  data: Record<string, string>;
  sections: Record<string, boolean>;
  recommendation: string;
  nextSteps: string;
  /** Notas internas — NUNCA aparecem na apresentação/PDF. */
  internalNotes: string;
  outcome: ReuniaoOutcome;
  updatedAt: string;
}

// ── Campos por tipo (dados necessários) ───────────────────────────
export const FIELDS: Record<ReuniaoType, Field[]> = {
  comprador: [
    { key: "necessidades", label: "Necessidades e preferências", kind: "textarea", resumo: true },
    { key: "orcamento", label: "Orçamento", kind: "money", resumo: true },
    { key: "capitalProprio", label: "Capital próprio", kind: "money" },
    { key: "financiamento", label: "Situação do financiamento", kind: "text", resumo: true },
    { key: "taxa", label: "Taxa (TAN)", kind: "percent" },
    { key: "prazo", label: "Prazo (anos)", kind: "number" },
    {
      key: "tipoImt",
      label: "Finalidade (IMT)",
      kind: "select",
      options: [
        { value: "hpp", label: "Habitação própria permanente" },
        { value: "secundaria", label: "Habitação secundária" },
      ],
    },
  ],
  vendedor: [
    { key: "caracteristicas", label: "Dados e características do imóvel", kind: "textarea", resumo: true },
    { key: "objetivos", label: "Objetivos e prazo de venda", kind: "text", resumo: true },
    { key: "valorEsperado", label: "Valor esperado", kind: "money", resumo: true },
    { key: "posicionamento", label: "Posicionamento comercial (estimativa, não é avaliação certificada)", kind: "text" },
    { key: "pontosFortes", label: "Pontos fortes", kind: "textarea", resumo: true },
    { key: "melhorias", label: "Melhorias recomendadas", kind: "textarea" },
    { key: "planoComercializacao", label: "Plano de comercialização", kind: "textarea", resumo: true },
    { key: "comissaoPct", label: "Comissão (%)", kind: "percent" },
    { key: "creditoEmDivida", label: "Crédito em dívida", kind: "money" },
    { key: "valorAquisicao", label: "Valor de aquisição (mais-valias)", kind: "money" },
    { key: "despesasVenda", label: "Custos associados à venda", kind: "money" },
    { key: "cronograma", label: "Cronograma da venda", kind: "text", resumo: true },
  ],
  investidor: [
    { key: "capitalDisponivel", label: "Capital disponível", kind: "money", resumo: true },
    { key: "objetivo", label: "Objetivo do investimento", kind: "text", resumo: true },
    { key: "horizonte", label: "Horizonte temporal", kind: "text", resumo: true },
    { key: "perfilRisco", label: "Perfil de risco", kind: "text", resumo: true },
    { key: "obras", label: "Obras estimadas", kind: "money" },
    { key: "rendaMensal", label: "Renda mensal estimada", kind: "money" },
    { key: "vacancyPct", label: "Vacância (%)", kind: "percent" },
    { key: "despesasAnuais", label: "Despesas anuais", kind: "money" },
    { key: "capitalProprio", label: "Capital próprio", kind: "money" },
    { key: "taxa", label: "Taxa (TAN)", kind: "percent" },
    { key: "prazo", label: "Prazo (anos)", kind: "number" },
  ],
};

// ── Secções da apresentação (o consultor escolhe quais aparecem) ──
export const SECTIONS: { key: string; label: string }[] = [
  { key: "resumo", label: "Resumo do perfil e objetivos" },
  { key: "imoveis", label: "Imóveis selecionados" },
  { key: "simulacoes", label: "Simulações" },
  { key: "comparacao", label: "Comparação entre imóveis" },
  { key: "recomendacao", label: "Recomendação do consultor" },
  { key: "proximosPassos", label: "Próximos passos" },
  { key: "contactos", label: "Contactos do consultor" },
];

export function defaultSections(): Record<string, boolean> {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, true]));
}

const n = (v: string | undefined) => Number(v ?? 0) || 0;

/** Executa o cálculo certo para a reunião (fora dos componentes visuais). */
export function runCalc(
  r: Reuniao,
  propertiesTotalPrice: number
): { lines: CalcLine[]; cenarios?: { nome: string; yieldLiquida: number; cashFlow: number }[] } {
  const d = r.data;
  if (r.type === "comprador") {
    return {
      lines: computeComprador({
        precoImovel: propertiesTotalPrice || n(d.orcamento),
        capitalProprio: n(d.capitalProprio),
        taxa: n(d.taxa),
        prazo: n(d.prazo),
        tipoImt: d.tipoImt === "secundaria" ? "secundaria" : "hpp",
      }),
    };
  }
  if (r.type === "vendedor") {
    return {
      lines: computeVendedor({
        valorEsperado: n(d.valorEsperado) || propertiesTotalPrice,
        comissaoPct: n(d.comissaoPct),
        creditoEmDivida: n(d.creditoEmDivida),
        valorAquisicao: n(d.valorAquisicao),
        despesasVenda: n(d.despesasVenda),
      }),
    };
  }
  return computeInvestidor({
    preco: propertiesTotalPrice || n(d.capitalDisponivel),
    obras: n(d.obras),
    capitalProprio: n(d.capitalProprio) || n(d.capitalDisponivel),
    taxa: n(d.taxa),
    prazo: n(d.prazo),
    rendaMensal: n(d.rendaMensal),
    vacancyPct: n(d.vacancyPct),
    despesasAnuais: n(d.despesasAnuais),
  });
}

/** Lista unificada (internos + externos) para mostrar no dossier. */
export function reuniaoDisplayProps(r: Reuniao): DisplayProperty[] {
  const internal: DisplayProperty[] = r.propertyIds
    .map((id) => propertyById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      key: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      location: `${p.parish}, ${p.municipality}`,
      typology: p.typology ?? undefined,
      area: p.area,
      reference: p.reference,
      external: false,
    }));
  const external: DisplayProperty[] = (r.externalProperties ?? []).map((e) => ({
    key: e.id,
    title: e.title,
    price: e.price,
    image: e.image,
    location: e.location,
    typology: e.typology,
    area: e.area,
    reference: "externo",
    external: true,
  }));
  return [...internal, ...external];
}

/** Soma dos preços (internos + externos) — base das simulações. */
export function reuniaoTotal(r: Reuniao): number {
  return reuniaoDisplayProps(r).reduce((s, p) => s + (p.price || 0), 0);
}

export const DISCLAIMER =
  "Os valores apresentados são meramente indicativos e não substituem aconselhamento jurídico, fiscal, financeiro ou bancário.";

// ── Reuniões demo (rascunhos) ─────────────────────────────────────
export const demoReunioes: Reuniao[] = [
  {
    id: "r-comprador",
    type: "comprador",
    status: "rascunho",
    clientName: "João P.",
    clientContact: "joao@email.pt",
    consultantId: "rui",
    propertyIds: ["3"],
    data: {
      necessidades: "T2/T3 no centro do Porto, com varanda e boa exposição solar.",
      orcamento: "450000",
      capitalProprio: "90000",
      financiamento: "Pré-aprovação em curso no banco.",
      taxa: "3.4",
      prazo: "35",
      tipoImt: "hpp",
    },
    sections: defaultSections(),
    recommendation:
      "Recomendo avançar com o HP-1044 pela localização e potencial de valorização.",
    nextSteps: "Agendar visita e submeter proposta esta semana.",
    internalNotes: "Cliente ansioso; concorrência de outro comprador — acelerar.",
    outcome: { resultado: "", objecoes: "", interesse: "", proximaAcao: "" },
    updatedAt: "2026-07-21",
  },
  {
    id: "r-vendedor",
    type: "vendedor",
    status: "rascunho",
    clientName: "Maria S.",
    clientContact: "maria@email.pt",
    consultantId: "ana",
    propertyIds: ["1"],
    data: {
      caracteristicas: "T3 em Alcântara, 138 m², com terraço e vista rio, remodelado.",
      objetivos: "Vender em 3 meses para reinvestir.",
      valorEsperado: "685000",
      posicionamento: "Acima da mediana da zona pela vista e estado de conservação.",
      pontosFortes: "Vista rio, terraço, garagem e boa exposição solar.",
      melhorias: "Pintura de refresco e home staging ligeiro.",
      planoComercializacao: "Fotografia e vídeo profissionais, destaque nos portais e base de compradores qualificados.",
      comissaoPct: "5",
      creditoEmDivida: "120000",
      valorAquisicao: "520000",
      despesasVenda: "1500",
      cronograma: "Sem. 1: preparação · Sem. 2–6: divulgação e visitas · Sem. 7–12: proposta e escritura.",
    },
    sections: defaultSections(),
    recommendation:
      "Valor de entrada em 685.000€ com margem de negociação; reavaliar em 3 semanas conforme procura.",
    nextSteps: "Assinar mandato e agendar sessão fotográfica.",
    internalNotes: "Proprietária com pressa; margem real até 650k.",
    outcome: { resultado: "", objecoes: "", interesse: "", proximaAcao: "" },
    updatedAt: "2026-07-21",
  },
  {
    id: "r-investidor",
    type: "investidor",
    status: "rascunho",
    clientName: "Carlos M.",
    clientContact: "carlos@email.pt",
    consultantId: "carla",
    propertyIds: ["3"],
    data: {
      capitalDisponivel: "150000",
      objetivo: "Rendimento por arrendamento de longa duração",
      horizonte: "7 anos",
      perfilRisco: "Moderado",
      obras: "15000",
      rendaMensal: "1500",
      vacancyPct: "8",
      despesasAnuais: "3600",
      capitalProprio: "120000",
      taxa: "3.6",
      prazo: "30",
    },
    sections: defaultSections(),
    recommendation:
      "Bom equilíbrio risco/retorno; yield líquida atrativa para a zona do Porto.",
    nextSteps: "Reservar o imóvel e pedir simulação bancária.",
    internalNotes: "Compara com outro T2 — realçar liquidez de arrendamento no Porto.",
    outcome: { resultado: "", objecoes: "", interesse: "", proximaAcao: "" },
    updatedAt: "2026-07-21",
  },
];

export const reuniaoById = (id: string): Reuniao | undefined =>
  demoReunioes.find((r) => r.id === id);
