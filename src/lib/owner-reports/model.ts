import { escapeHtml as escape } from "@/lib/email-template";

export const REPORT_SECTIONS = {
  visits: "Visitas", leads: "Pedidos de informação e origem",
  proposals: "Propostas e negociação", promotion: "Promoção e campanhas",
  views: "Visualizações do website", matches: "Compradores compatíveis", prices: "Alterações de preço",
} as const;
export type ReportSection = keyof typeof REPORT_SECTIONS;
export const REPORT_TEMPLATES = ["Carta pessoal", "Resumo de atividade", "Consultor em destaque"] as const;
export interface ReportSettings {
  enabled: boolean;
  frequency: "monthly" | "fortnightly" | "weekly";
  day: number;
  template: number;
  rotate: boolean;
  format: "html" | "text";
  sections: ReportSection[];
  introduction: string;
  nextSteps: string;
}
export const DEFAULT_REPORT: ReportSettings = {
  enabled: true, frequency: "monthly", day: 1, template: 0, rotate: true,
  format: "html", sections: Object.keys(REPORT_SECTIONS) as ReportSection[],
  introduction: "", nextSteps: "",
};
export interface ReportData {
  propertyId: string; reference: string; title: string; ownerName: string;
  agentName: string; agentEmail: string; agentPhoto?: string;
  from: string; until: string;
  blocks: { key: ReportSection; title: string; lines: string[] }[];
}
export function nextReportDate(frequency: ReportSettings["frequency"], day: number, after: Date): Date {
  if (frequency !== "monthly") {
    const result = new Date(after);
    result.setUTCDate(result.getUTCDate() + (frequency === "weekly" ? 7 : 14));
    return result;
  }
  const result = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), Math.min(28, Math.max(1, day)), 10));
  if (result <= after) result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}
export function initialReportStart(settings: ReportSettings, createdAt: string, now: Date): string {
  const start = nextReportDate(settings.frequency,settings.day,now);
  if (settings.frequency === "monthly") start.setUTCMonth(start.getUTCMonth()-1);
  else start.setUTCDate(start.getUTCDate()-(settings.frequency==="weekly"?7:14));
  return new Date(Math.max(start.getTime(),Date.parse(createdAt))).toISOString();
}
export function validateSettings(value: unknown): ReportSettings {
  const b = value as Partial<ReportSettings> | null;
  if (!b || typeof b.enabled !== "boolean" || !["monthly","fortnightly","weekly"].includes(String(b.frequency)) ||
      !Number.isInteger(b.day) || b.day! < 1 || b.day! > 28 ||
      !Number.isInteger(b.template) || b.template! < 0 || b.template! > 2 ||
      typeof b.rotate !== "boolean" || !["html","text"].includes(String(b.format)) ||
      !Array.isArray(b.sections) || !b.sections.length || b.sections.some(k => typeof k !== "string" || !Object.hasOwn(REPORT_SECTIONS,k)) ||
      typeof b.introduction !== "string" || typeof b.nextSteps !== "string" ||
      b.introduction.length > 2000 || b.nextSteps.length > 2000) throw new Error("Verifique as opções do relatório.");
  return { enabled:b.enabled, frequency:b.frequency!, day:b.day!, template:b.template!, rotate:b.rotate,
    format:b.format!, sections:[...new Set(b.sections)], introduction:b.introduction, nextSteps:b.nextSteps };
}
const date = (s: string) => new Intl.DateTimeFormat("pt-PT", { timeZone:"Europe/Lisbon" }).format(new Date(s));
export function renderOwnerReport(data: ReportData, settings: ReportSettings, sequence = 0) {
  const template = settings.rotate ? (settings.template + sequence) % 3 : settings.template;
  const variation = sequence % 3;
  const subject = [`Atualização do seu imóvel · ${data.reference}`,`O seu imóvel · atividade de ${date(data.from)} a ${date(data.until)}`,`Ponto de situação · ${data.reference}`][variation];
  const greeting = `Olá${data.ownerName ? " " + data.ownerName : ""},`;
  const intro = settings.introduction.trim() || [
    "Partilho consigo a atividade registada no Helix para o seu imóvel neste período.",
    "Envio-lhe o ponto de situação do seu imóvel, com os contactos e ações registados neste período.",
    "Aqui está a atualização da atividade do seu imóvel. Fico disponível para conversarmos sobre os próximos passos.",
  ][variation];
  const blocks = data.blocks.filter(b => settings.sections.includes(b.key));
  const period = `De ${date(data.from)} a ${date(data.until)}`;
  const closing = "Para me dar o seu feedback ou colocar alguma questão, basta responder a este email.";
  const text = [greeting,intro,`${data.reference} · ${data.title}`,period,
    ...blocks.map(b => [b.title,...b.lines].join("\n")),
    settings.nextSteps.trim() ? `Próximos passos\n${settings.nextSteps.trim()}` : "",
    closing,data.agentName,data.agentEmail].filter(Boolean).join("\n\n");
  const paragraphs = (v:string) => escape(v).replace(/\n/g,"<br>");
  const color = ["#0D3B66","#A31621","#0D3B66"][template];
  const photo = template === 2 && /^https:\/\//i.test(data.agentPhoto ?? "") ?
    `<img src="${escape(data.agentPhoto!)}" width="80" height="80" alt="${escape(data.agentName)}" style="border-radius:50%;object-fit:cover;margin-bottom:12px">` : "";
  const sections = blocks.map(b => {
    const lines = b.lines.map(line=>`<p style="margin:6px 0;line-height:1.6">${escape(line)}</p>`).join("");
    if (template === 1) {
      return `<tr><td style="padding:10px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px"><tr><td style="padding:16px"><p style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${color};margin:0 0 12px">${escape(b.title)}</p>${lines}</td></tr></table></td></tr>`;
    }
    return `<tr><td style="padding:${template===0?"12px 28px":"18px 28px"};${template===2?"border-top:1px solid #e5e7eb":""}"><h2 style="font-size:${template===0?"16":"17"}px;color:${color};margin:0 0 10px">${escape(b.title)}</h2>${lines}</td></tr>`;
  }).join("");
  const heading = template === 2
    ? `<tr><td style="padding:28px;background:#0D3B66;color:white">${photo}<p style="font-size:20px;font-weight:bold;margin:0 0 5px">${escape(data.agentName)}</p><p style="font-size:13px;margin:0">O seu consultor HousePro</p></td></tr>`
    : template === 1
      ? `<tr><td style="padding:20px 28px;background:#A31621;color:white;font-size:13px;letter-spacing:1px">HOUSEPRO · RELATÓRIO DE ATIVIDADE</td></tr>` : "";
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${template===0?"#fff":"#f3f4f6"};font-family:Arial,sans-serif;color:#182638"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:white;border-top:${template===1?"6":"2"}px solid ${color}">${heading}<tr><td style="padding:28px"><p style="font-size:13px;color:${color};margin:0">HousePro · ${escape(data.agentName)}</p><h1 style="font-size:24px;line-height:1.3">${escape(data.title)}</h1><p style="font-size:13px;color:#64748b">${escape(data.reference)} · ${period}</p><p>${escape(greeting)}</p><p style="line-height:1.7">${paragraphs(intro)}</p></td></tr>${sections}${settings.nextSteps.trim()?`<tr><td style="padding:20px 28px;background:#f8fafc"><h2 style="font-size:17px">Próximos passos</h2><p style="line-height:1.6">${paragraphs(settings.nextSteps)}</p></td></tr>`:""}<tr><td style="padding:28px;border-top:1px solid #e5e7eb"><p style="line-height:1.7">${closing}</p><p style="font-weight:bold">${escape(data.agentName)}</p><a style="color:${color}" href="mailto:${escape(data.agentEmail)}?subject=${encodeURIComponent("Feedback · "+data.reference)}">Partilhar feedback</a></td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html};
}


export function prepareOwnerMessage(
  data: ReportData, settings: ReportSettings, sequence: number,
  sender: string, ownerEmail: string, bcc: string[],
) {
  const email=renderOwnerReport(data,settings,sequence);
  const address=sender.match(/<([^<>]+)>/)?.[1]??sender;
  return {
    from:`${data.agentName.replace(/[<>\r\n"]/g,"")} · HousePro <${address}>`,
    to:[ownerEmail], reply_to:data.agentEmail,
    bcc:[...new Set(bcc.map(value=>value.toLowerCase()))].filter(value=>value!==ownerEmail.toLowerCase()),
    subject:email.subject,text:email.text,...(settings.format==="html"?{html:email.html}:{}),
  };
}
