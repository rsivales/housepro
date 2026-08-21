/**
 * Funil da calculadora de mais-valias (Clínica de Finanças): tipos da
 * submissão, validação por etapa, montagem do input do motor, construção da
 * lead (resumo MÍNIMO, sem valores financeiros excessivos) e do relatório por
 * e-mail (onde os valores são apresentados — nunca no website).
 */
import type { NewLead } from "@/lib/db/repo";
import { parseCampaign, resolveConsultant, isValidEmail, isValidPhone } from "@/lib/valuation";
import {
  calcularMaisValias, ENGINE_VERSION, FISCAL_YEAR, LAST_REVIEWED, SOURCES,
  type Aquisicao, type Residencia, type MaisValiasInput, type MaisValiasResult,
} from "@/lib/tools/mais-valias-fiscal";

export { parseCampaign };

/** Taxas marginais de IRS (indicativas) para estimar o imposto (opcional). */
export const TAXAS_MARGINAIS: { label: string; rate: number }[] = [
  { label: "Não sei / prefiro não indicar", rate: -1 },
  { label: "Até ~21 000 € (13% a 22%)", rate: 0.22 },
  { label: "~21 000–40 000 € (25% a 32%)", rate: 0.32 },
  { label: "~40 000–80 000 € (35% a 43,5%)", rate: 0.435 },
  { label: "Mais de ~80 000 € (45% a 48%)", rate: 0.48 },
];

export interface MvSubmission {
  // Etapa 1 — Imóvel
  valorAquisicao?: string;
  anoAquisicao?: string;
  valorVenda?: string;
  anoVenda?: string;
  quota?: string;
  aquisicao?: Aquisicao;
  // Etapa 2 — Despesas
  imt?: string; selo?: string; escritura?: string; registos?: string;
  comissao?: string; certificado?: string; obras?: string; outras?: string;
  temComprovativos?: boolean;
  // Etapa 3 — Situação fiscal
  residencia?: Residencia;
  hpp?: boolean;
  reinvestimento?: boolean;
  valorReinvestido?: string;
  divida?: string;
  taxaMarginal?: string; // rate as string; "-1" = não indicar
  // Etapa 4 — Contacto
  name?: string; email?: string; phone?: string;
  contactPreference?: "telefone" | "whatsapp" | "email";
  bestTime?: string;
  consent?: boolean; marketingConsent?: boolean;
  // Metadados
  pageUrl?: string; referrerUrl?: string; utm?: Record<string, string>; ref?: string; language?: string;
}

const num = (s?: string) => {
  let t = String(s ?? "").replace(/[^\d.,-]/g, "");
  // Formato PT: se houver vírgula, é o decimal → remove pontos (milhares).
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

export function validateStep(step: number, s: MvSubmission): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (num(s.valorAquisicao) <= 0) e.valorAquisicao = "Indique o valor de aquisição.";
    if (num(s.valorVenda) <= 0) e.valorVenda = "Indique o valor previsto de venda.";
    if (!s.anoAquisicao) e.anoAquisicao = "Indique o ano de aquisição.";
    if (!s.anoVenda) e.anoVenda = "Indique o ano da venda.";
    if (!s.aquisicao) e.aquisicao = "Indique como adquiriu o imóvel.";
  }
  if (step === 3) {
    if (!s.name?.trim()) e.name = "Indique o seu nome.";
    if (!isValidEmail(s.email)) e.email = "Indique um e-mail válido — a estimativa é enviada por e-mail.";
    if (s.phone && !isValidPhone(s.phone)) e.phone = "Telefone inválido.";
    if (!s.consent) e.consent = "É necessário o seu consentimento para tratarmos o pedido e enviar o relatório.";
  }
  return e;
}

export function validateSubmission(s: MvSubmission): Record<string, string> {
  return { ...validateStep(0, s), ...validateStep(3, s) };
}

/** Converte a submissão no input do motor fiscal. */
export function toEngineInput(s: MvSubmission): MaisValiasInput {
  const despesas = [
    { label: "IMT", amount: num(s.imt) },
    { label: "Imposto do Selo", amount: num(s.selo) },
    { label: "Escritura", amount: num(s.escritura) },
    { label: "Registos", amount: num(s.registos) },
    { label: "Comissão de mediação", amount: num(s.comissao) },
    { label: "Certificado energético", amount: num(s.certificado) },
    { label: "Obras elegíveis", amount: num(s.obras) },
    { label: "Outras despesas", amount: num(s.outras) },
  ].filter((d) => d.amount > 0).map((d) => ({ ...d, hasProof: s.temComprovativos }));

  const rate = num(s.taxaMarginal);
  return {
    valorAquisicao: num(s.valorAquisicao),
    anoAquisicao: Number(s.anoAquisicao) || new Date().getFullYear(),
    valorVenda: num(s.valorVenda),
    anoVenda: Number(s.anoVenda) || new Date().getFullYear(),
    quota: num(s.quota) || 100,
    aquisicao: s.aquisicao ?? "compra",
    despesas,
    residencia: s.residencia ?? "residente",
    hpp: !!s.hpp,
    reinvestimento: !!s.reinvestimento,
    valorReinvestido: num(s.valorReinvestido) || undefined,
    divida: num(s.divida) || undefined,
    taxaMarginalEstimada: rate > 0 ? rate : undefined,
  };
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n));

/**
 * Resumo MÍNIMO para a lead — sem valores financeiros (respeita minimização
 * de dados). Guarda apenas o contexto de acompanhamento.
 */
export function summarizeForLead(s: MvSubmission, r: MaisValiasResult): string {
  return [
    "Simulação de mais-valias (estimativa enviada por e-mail)",
    `Aquisição: ${s.aquisicao ?? "—"} · Venda prevista: ${s.anoVenda ?? "—"}`,
    `Resultado: ${r.menosValia ? "menos-valia" : "mais-valia estimada"}`,
    `Reinvestimento: ${s.reinvestimento ? "sim" : "não"} · Residência: ${s.residencia ?? "residente"}`,
    r.needsAnalysis ? "Necessita de análise personalizada." : null,
  ].filter(Boolean).join("\n");
}

/** Constrói a lead para o Helix (sem valores financeiros na lead). */
export function buildLead(s: MvSubmission, r: MaisValiasResult, emailStatus: string): NewLead {
  const consultant = resolveConsultant(s.ref);
  const contact = (isValidPhone(s.phone) ? s.phone : s.email) ?? s.email ?? "";
  return {
    ownerId: consultant ?? "",
    assignedAgentId: consultant,
    unassigned: !consultant,
    referrerId: consultant,
    name: (s.name ?? "").trim(),
    contact: contact.trim(),
    email: s.email?.trim() || undefined,
    intent: "custos",
    source: "site",
    subSource: "Calculadora de mais-valias",
    pipeline: "proprietarios",
    stage: 0,
    qualification: "novo",
    message: summarizeForLead(s, r),
    contactPreference: s.contactPreference,
    bestTime: s.bestTime,
    marketingConsent: !!s.marketingConsent,
    formVersion: ENGINE_VERSION,
    fiscalYear: FISCAL_YEAR,
    emailStatus,
    pageUrl: s.pageUrl,
    referrerUrl: s.referrerUrl,
    utm: s.utm && Object.keys(s.utm).length ? s.utm : undefined,
    consent: {
      base: "consentimento",
      at: new Date().toISOString(),
      text: "Tratamento de dados para envio do relatório de simulação e resposta ao pedido (RGPD).",
    },
  };
}

/** Relatório por e-mail — os valores aparecem SÓ aqui (nunca no website). */
export function buildEmailReport(s: MvSubmission, r: MaisValiasResult): { subject: string; text: string } {
  const nome = (s.name ?? "").trim() || "Olá";
  const linhas: string[] = [
    `Olá ${nome},`,
    "",
    "Obrigado por usar o simulador de mais-valias da Clínica de Finanças HousePro (simuladores e informação imobiliária). Segue a sua estimativa.",
    "",
    "RESUMO DOS DADOS",
    `• Forma de aquisição: ${s.aquisicao ?? "—"}`,
    `• Ano de aquisição: ${s.anoAquisicao ?? "—"} · Ano de venda: ${s.anoVenda ?? "—"}`,
    `• Percentagem de propriedade: ${s.quota ?? "100"}%`,
    `• Residência fiscal: ${s.residencia ?? "residente"}`,
    "",
    "ESTIMATIVA",
    `• Valor de aquisição corrigido: ${eur(r.aquisicaoCorrigida)} (coeficiente ${r.coeficiente})`,
    `• Despesas consideradas: ${eur(r.despesasElegiveis)}`,
    `• Mais-valia bruta estimada: ${r.menosValia ? "menos-valia (0 €)" : eur(r.maisValiaBruta)}`,
    r.reinvestimentoFracao > 0 ? `• Reinvestimento aplicado: ${Math.round(r.reinvestimentoFracao * 100)}%` : null,
    `• Base potencialmente sujeita a tributação (50%): ${eur(r.baseTributavel)}`,
    r.impostoEstimado != null
      ? `• Imposto estimado (com a taxa indicada): ${eur(r.impostoEstimado)}`
      : "• Imposto final: depende dos restantes rendimentos, agregado familiar e regras aplicáveis ao seu caso.",
    "",
    "NOTAS",
    ...r.notes.map((n) => `• ${n}`),
    "",
    "METODOLOGIA E FONTES",
    "Mais-valia = valor de realização − (aquisição × coeficiente) − despesas/encargos elegíveis.",
    `Ano fiscal considerado: ${r.fiscalYear} · Última revisão: ${LAST_REVIEWED} · Versão: ${r.engineVersion}`,
    "Fontes: " + SOURCES.join("; ") + ".",
    "",
    "NOTA IMPORTANTE",
    "Esta ferramenta fornece uma estimativa meramente indicativa, baseada nos dados introduzidos e nas regras gerais aplicáveis. Não substitui aconselhamento fiscal, contabilístico ou jurídico, nem constitui uma liquidação oficial da Autoridade Tributária.",
    "",
    "Um consultor HousePro poderá contactá-lo para ajudar a interpretar a simulação e esclarecer o seu caso.",
  ].filter(Boolean) as string[];

  return { subject: "A sua simulação de mais-valias imobiliárias", text: linhas.join("\n") };
}

export function dedupeKey(s: MvSubmission): string {
  const norm = (v?: string) => (v ?? "").toLowerCase().trim();
  return [norm(s.email), norm(s.anoVenda), norm(s.valorVenda)].join("|");
}

export function runSimulation(s: MvSubmission): MaisValiasResult {
  return calcularMaisValias(toEngineInput(s));
}
