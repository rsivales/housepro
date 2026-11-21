/**
 * Funil da calculadora de mais-valias (Clínica de Finanças): tipos da
 * submissão, validação por etapa, montagem do input do motor, construção da
 * lead (resumo MÍNIMO, sem valores financeiros excessivos) e do relatório por
 * e-mail (onde os valores são apresentados — nunca no website).
 */
import type { NewLead } from "@/lib/db/repo";
import {escapeHtml} from "@/lib/email-template";
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
  advanced?: boolean;
  rendimentoColetavel?: string; rendimentoConjuge?: string;
  tributacaoConjunta?: boolean; dependentes?: string;
  domicilioFiscal12Meses?: boolean; reinvestimentoNoPrazo?: boolean; reinvestimentoFundosProprios?: boolean;
  apoioPublicoRelevante?: boolean; outroGanhoMesmoAno?: boolean; situacaoEspecial?: boolean;
  dataSource?: "cliente_ligacao" | "email" | "telefone" | "presencial";
  consentRecorded?: boolean;
  vptRealizacao?: string; dataAquisicao?: string; dataVenda?: string;
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
  if(step===2&&s.advanced){
    if(s.rendimentoColetavel && (num(s.rendimentoColetavel)<0||num(s.rendimentoColetavel)>100000000))e.rendimentoColetavel="Indique um rendimento coletável válido.";
    if(s.rendimentoConjuge && (num(s.rendimentoConjuge)<0||num(s.rendimentoConjuge)>100000000))e.rendimentoConjuge="Indique um rendimento válido.";
    if(s.tributacaoConjunta&&s.rendimentoColetavel&&!s.rendimentoConjuge)e.rendimentoConjuge="Indique o rendimento coletável do cônjuge (0 se não houver).";
    if(s.dependentes&&(!Number.isInteger(num(s.dependentes))||num(s.dependentes)>30||num(s.dependentes)<0))e.dependentes="Indique o número de dependentes.";
    if((s.rendimentoColetavel||s.rendimentoConjuge)&&(!s.dataSource||!s.consentRecorded))e.consentRecorded="Registe a forma de recolha e a autorização do cliente antes de utilizar rendimentos fiscais.";
    if(s.dataAquisicao&&s.anoAquisicao&&Number(s.dataAquisicao.slice(0,4))!==Number(s.anoAquisicao))e.dataAquisicao="A data deve coincidir com o ano de aquisição.";
    if(s.dataVenda&&s.anoVenda&&Number(s.dataVenda.slice(0,4))!==Number(s.anoVenda))e.dataVenda="A data deve coincidir com o ano de venda.";
  }
  return e;
}

export function validateSubmission(s: MvSubmission): Record<string, string> {
  return { ...validateStep(0, s), ...validateStep(2, s), ...validateStep(3, s) };
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
    rendimentoColetavel:s.advanced&&s.rendimentoColetavel!==undefined&&s.rendimentoColetavel!==""?num(s.rendimentoColetavel):undefined,
    rendimentoConjuge:s.advanced&&s.tributacaoConjunta?num(s.rendimentoConjuge):undefined,
    tributacaoConjunta:s.advanced&&!!s.tributacaoConjunta,
    dependentes:s.advanced?num(s.dependentes):undefined,
    domicilioFiscal12Meses:s.advanced?s.domicilioFiscal12Meses:undefined,
    reinvestimentoNoPrazo:s.advanced?s.reinvestimentoNoPrazo:undefined,
    reinvestimentoFundosProprios:s.advanced?s.reinvestimentoFundosProprios:undefined,
    apoioPublicoRelevante:s.advanced&&s.apoioPublicoRelevante,
    outroGanhoMesmoAno:s.advanced&&s.outroGanhoMesmoAno,
    situacaoEspecial:s.advanced&&s.situacaoEspecial,
    vptRealizacao:s.advanced?num(s.vptRealizacao):undefined,
    dataAquisicao:s.advanced?s.dataAquisicao:undefined,
    dataVenda:s.advanced?s.dataVenda:undefined,
  };
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n));

/**
 * Resumo MÍNIMO para a lead — sem valores financeiros (respeita minimização
 * de dados). Guarda apenas o contexto de acompanhamento.
 */
export function summarizeForLead(s: MvSubmission, r: MaisValiasResult): string {
  return [
    "Simulação de mais-valias — pedido de análise",
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
  const input = toEngineInput(s);
  const linhas: string[] = [
    `Olá ${nome},`,
    "",
    "Obrigado por usar o simulador de mais-valias da Clínica de Finanças HousePro (simuladores e informação imobiliária). Segue a sua estimativa.",
    "",
    "RESUMO DOS DADOS",
    `• Forma de aquisição: ${s.aquisicao ?? "—"}`,
    `• Valor de aquisição: ${eur(input.valorAquisicao)} · Valor de venda: ${eur(input.valorVenda)}`,
    ...input.despesas.map(d => `• ${d.label}: ${eur(d.amount)}`),
    `• Habitação própria e permanente: ${s.hpp ? "sim" : "não"}`,
    `• Reinvestimento: ${s.reinvestimento ? "sim" : "não"} · Valor: ${eur(num(s.valorReinvestido))}`,
    `• Dívida: ${eur(num(s.divida))}`,
    `• Taxa marginal indicada: ${input.taxaMarginalEstimada != null ? `${input.taxaMarginalEstimada * 100}%` : "não indicada"}`,
    input.rendimentoColetavel!==undefined?`• Rendimento coletável sem a venda: ${eur(input.rendimentoColetavel)}${input.tributacaoConjunta?` · cônjuge: ${eur(input.rendimentoConjuge??0)}`:""}`:null,
    s.advanced?`• Agregado: ${input.tributacaoConjunta?"tributação conjunta":"individual"} · dependentes: ${input.dependentes??0}`:null,
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
      ? `• Variação indicativa do IRS pela venda: ${eur(r.impostoEstimado)}`
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
    "NOTA IMPORTANTE — ESTIMATIVA, NÃO É LIQUIDAÇÃO DE IRS",
    "Esta ferramenta fornece uma estimativa meramente indicativa, baseada nos dados introduzidos e nas regras gerais aplicáveis. Não substitui aconselhamento fiscal, contabilístico ou jurídico, nem constitui uma liquidação oficial da Autoridade Tributária.",
    "",
    "Um consultor HousePro poderá contactá-lo para ajudar a interpretar a simulação e esclarecer o seu caso.",
  ].filter(Boolean) as string[];

  return { subject: "A sua simulação de mais-valias imobiliárias", text: linhas.join("\n") };
}

export function renderMvReportEmail(report:{subject:string;text:string},agent?:{name?:string;email?:string;photo?:string;publicTitle?:string}){
  const safe=escapeHtml;
  const paragraphs=report.text.split("\n").map(line=>{
    if(line.startsWith("NOTA IMPORTANTE"))return `<p style="font-size:15px;font-weight:800;color:#A31621;margin:24px 0 8px">${safe(line)}</p>`;
    if(line.startsWith("Esta ferramenta fornece"))return `<p style="font-weight:700;line-height:1.6;color:#27364b">${safe(line)}</p>`;
    if(["RESUMO DOS DADOS","ESTIMATIVA","NOTAS","METODOLOGIA E FONTES"].includes(line))return `<h2 style="font-size:14px;letter-spacing:1px;color:#0D3B66;border-top:1px solid #e7edf1;padding-top:16px;margin:22px 0 9px">${safe(line)}</h2>`;
    return line?`<p style="margin:5px 0;line-height:1.6">${safe(line)}</p>`:"";
  }).join("");
  const photo=agent?.photo&&/^https:\/\//.test(agent.photo)?`<img src="${safe(agent.photo)}" alt="Fotografia do consultor" width="68" height="68" style="border-radius:50%;object-fit:cover">`:"";
  const consultant=agent?.name?`<tr><td style="padding:22px 32px;border-top:1px solid #e5e7eb"><table role="presentation"><tr><td style="padding-right:15px">${photo}</td><td><strong>${safe(agent.name)}</strong><br>${safe(agent.publicTitle||"Consultor imobiliário HousePro")}<br>${agent.email?`<a href="mailto:${safe(agent.email)}" style="color:#A31621">${safe(agent.email)}</a>`:""}</td></tr></table></td></tr>`:"";
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f5f7;color:#182638;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:28px 10px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:white;border:1px solid #e5e7eb"><tr><td style="border-top:6px solid #0D3B66;padding:24px 32px"><img src="https://housepro.pt/brand/housepro-designer-red.png" alt="HousePro" width="180" style="display:block;height:auto"></td></tr><tr><td style="padding:12px 32px 28px"><p style="color:#A31621;font-size:11px;letter-spacing:2px;font-weight:bold">CLÍNICA DE FINANÇAS · HOUSEPRO</p><h1 style="font-family:Georgia,serif;font-size:26px;color:#0D3B66">${safe(report.subject)}</h1><p style="text-align:right;margin:0"><img src="https://housepro.pt/brand/housepro-designer-mark.png" width="35" alt="" style="opacity:.16"></p>${paragraphs}</td></tr>${consultant}<tr><td style="background:#0D3B66;padding:20px 32px;color:white;font-size:12px">HousePro · Paixão pelo que fazemos<br><a href="https://housepro.pt/privacidade" style="color:white">Privacidade</a></td></tr></table></td></tr></table></body></html>`;
}

export function dedupeKey(s: MvSubmission): string {
  const norm = (v?: string) => (v ?? "").toLowerCase().trim();
  return [norm(s.email), norm(s.anoVenda), norm(s.valorVenda)].join("|");
}

export function runSimulation(s: MvSubmission): MaisValiasResult {
  return calcularMaisValias(toEngineInput(s));
}
