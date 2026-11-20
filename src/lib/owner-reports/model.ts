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
  frequency: 15 | 30 | 45 | 60;
  day: number;
  quarterly: boolean;
  salutation: string;
  otherSalutation: string;
  additionalEmail: string;
  template: number;
  rotate: boolean;
  format: "html" | "text";
  sections: ReportSection[];
  introduction: string;
  nextSteps: string;
}
export const DEFAULT_REPORT: ReportSettings = {
  enabled: true, frequency: 30, day: 1, quarterly: false,
  salutation:"",otherSalutation:"",additionalEmail:"",template: 0, rotate: true,
  format: "html", sections: Object.keys(REPORT_SECTIONS) as ReportSection[],
  introduction: "", nextSteps: "",
};
export interface ReportData {
  propertyId: string; reference: string; title: string; ownerName: string;
  agentName: string; agentEmail: string; agentPhoto?: string; agentPhone?: string; agentTitle?: string;
  activityCount: number; quarterly?: boolean;
  from: string; until: string;
  blocks: { key: ReportSection; title: string; lines: string[] }[];
}
export function nextReportDate(frequency: ReportSettings["frequency"], day: number, after: Date): Date {
  void day;
  const result = new Date(after);
  result.setUTCDate(result.getUTCDate() + frequency);
  return result;
}
export function nextQuarterlyDate(after:Date):Date {
  const result=new Date(after);
  const day=result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth()+3);
  const lastDay=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();
  result.setUTCDate(Math.min(day,lastDay));
  return result;
}
export function initialReportStart(settings: ReportSettings, createdAt: string, now: Date): string {
  return new Date(Math.max(now.getTime()-settings.frequency*86400000,Date.parse(createdAt))).toISOString();
}
export function validateSettings(value: unknown): ReportSettings {
  const b = value as Partial<ReportSettings> | null;
  const legacy=String(b?.frequency);
  const frequency=legacy==="monthly"?30:legacy==="fortnightly"||legacy==="weekly"?15:Number(b?.frequency);
  if (!b || typeof b.enabled !== "boolean" || ![15,30,45,60].includes(frequency) ||
      !Number.isInteger(b.day) || b.day! < 1 || b.day! > 28 ||
      !Number.isInteger(b.template) || b.template! < 0 || b.template! > 2 ||
      typeof b.rotate !== "boolean" || !["html","text"].includes(String(b.format)) ||
      !Array.isArray(b.sections) || !b.sections.length || b.sections.some(k => typeof k !== "string" || !Object.hasOwn(REPORT_SECTIONS,k)) ||
      typeof b.introduction !== "string" || typeof b.nextSteps !== "string" ||
      b.introduction.length > 2000 || b.nextSteps.length > 2000) throw new Error("Verifique as opções do relatório.");
  const salutation=b.salutation??"",otherSalutation=(b.otherSalutation??"").trim(),additionalEmail=(b.additionalEmail??"").trim().toLowerCase();
  if(typeof salutation!=="string"||!["","Sr.","Sra.","Dr.","Dra.","Eng.","Eng.ª","Arq.","Arq.ª","Outro"].includes(salutation)||
    typeof otherSalutation!=="string"||otherSalutation.length>40||/[<>\r\n]/.test(otherSalutation)||
    (salutation==="Outro"&&!otherSalutation)||typeof additionalEmail!=="string"||
    (additionalEmail!==""&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(additionalEmail)))throw new Error("Confirme o tratamento e o destinatário adicional.");
  return { enabled:b.enabled, frequency:frequency as ReportSettings["frequency"], day:b.day!,quarterly:b.quarterly===true,
    salutation,otherSalutation,additionalEmail,template:b.template!,rotate:b.rotate,format:b.format!,
    sections:[...new Set(b.sections)], introduction:b.introduction, nextSteps:b.nextSteps };
}
const date = (s: string) => new Intl.DateTimeFormat("pt-PT", { timeZone:"Europe/Lisbon" }).format(new Date(s));
export function renderOwnerReport(data: ReportData, settings: ReportSettings, sequence = 0) {
  const template = settings.rotate ? (settings.template + sequence) % 3 : settings.template;
  const variation = sequence % 3;
  const subject = data.quarterly?`Balanço trimestral do seu imóvel · ${data.reference}`:
    [`Atualização do seu imóvel · ${data.reference}`,`O seu imóvel · atividade de ${date(data.from)} a ${date(data.until)}`,`Ponto de situação · ${data.reference}`][variation];
  const title=settings.salutation==="Outro"?settings.otherSalutation:settings.salutation;
  const formal=settings.salutation==="Outro"?"":(["Sra.","Dra.","Eng.ª","Arq.ª"].includes(settings.salutation)?"Exma. ":"Exmo. ");
  const greeting = data.ownerName ? `${title?formal+title+" ":"Olá "}${data.ownerName},` : "Olá,";
  const intro = settings.introduction.trim() || [
    "Partilho consigo a atividade registada no Helix para o seu imóvel neste período.",
    "Envio-lhe o ponto de situação do seu imóvel, com os contactos e ações registados neste período.",
    "Aqui está a atualização da atividade do seu imóvel. Fico disponível para conversarmos sobre os próximos passos.",
  ][variation];
  const blocks = data.blocks.filter(b => settings.sections.includes(b.key));
  const period = `${data.quarterly?"Balanço trimestral · ":""}De ${date(data.from)} a ${date(data.until)}`;
  const closing = "Para me dar o seu feedback ou colocar alguma questão, basta responder a este email.";
  const subscribe="https://housepro.pt/subscrever?origem=relatorio";
  const text = [greeting,intro,`${data.reference} · ${data.title}`,period,
    ...blocks.map(b => [b.title,...b.lines].join("\n")),
    settings.nextSteps.trim() ? `Próximos passos\n${settings.nextSteps.trim()}` : "",
    closing,data.agentName,data.agentTitle,data.agentPhone,data.agentEmail,
    `Se desejar receber imóveis e novidades da HousePro, pode escolher o que subscrever aqui: ${subscribe}. Esta opção é facultativa.`].filter(Boolean).join("\n\n");
  const paragraphs = (v:string) => escape(v).replace(/\n/g,"<br>");
  const color = ["#0D3B66","#A31621","#0D3B66"][template];
  const photo = /^https:\/\//i.test(data.agentPhoto ?? "") ?
    `<img src="${escape(data.agentPhoto!)}" width="76" height="76" alt="Fotografia de ${escape(data.agentName)}" style="display:block;width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid #e9edf2">` :
    `<span style="display:inline-block;width:76px;height:76px;line-height:76px;text-align:center;border-radius:50%;background:#e9edf2;color:#0D3B66;font-size:22px;font-weight:bold">${escape(data.agentName.trim().slice(0,1).toUpperCase())}</span>`;
  const sections = blocks.map(b => {
    const lines = b.lines.map(line=>`<p style="margin:6px 0;line-height:1.6">${escape(line)}</p>`).join("");
    if (template === 1) {
      return `<tr><td style="padding:10px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px"><tr><td style="padding:16px"><p style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${color};margin:0 0 12px">${escape(b.title)}</p>${lines}</td></tr></table></td></tr>`;
    }
    return `<tr><td style="padding:${template===0?"12px 28px":"18px 28px"};${template===2?"border-top:1px solid #e5e7eb":""}"><h2 style="font-size:${template===0?"16":"17"}px;color:${color};margin:0 0 10px">${escape(b.title)}</h2>${lines}</td></tr>`;
  }).join("");
  const logo=`<a href="https://housepro.pt"><img src="https://housepro.pt/brand/housepro-red.png" width="174" alt="HousePro" style="display:block;width:174px;max-width:100%;height:auto;border:0"></a>`;
  const mark=`<img src="https://housepro.pt/brand/watermark-bird.png" width="64" alt="" style="display:block;width:64px;height:auto;opacity:.13;border:0">`;
  const masthead=template===1
    ? `<tr><td style="padding:29px 32px;background:#0D3B66"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#fff;padding:12px;border-radius:6px">${logo}</td></tr></table><p style="color:#e8d6d6;font-size:11px;letter-spacing:2px;margin:18px 0 0">ACOMPANHAMENTO DO SEU IMÓVEL</p></td></tr>`
    : `<tr><td style="padding:26px 32px;border-bottom:1px solid #e8edf1">${logo}</td></tr>`;
  const consultant=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="96" valign="middle" style="width:96px">${photo}</td><td valign="middle"><p style="font-weight:bold;font-size:16px;margin:0 0 5px;color:#0D3B66">${escape(data.agentName)}</p><p style="margin:0;font-size:13px;color:#64748b">${escape(data.agentTitle||"Consultor imobiliário HousePro")}</p>${data.agentPhone?`<p style="margin:5px 0 0;font-size:13px;color:#64748b">${escape(data.agentPhone)}</p>`:""}<p style="margin:5px 0 0;font-size:13px"><a href="mailto:${escape(data.agentEmail)}" style="color:#A31621">${escape(data.agentEmail)}</a></p></td></tr></table>`;
  const headline=template===2?`<tr><td style="padding:28px 32px;background:#f1f5f7">${consultant}</td></tr>`:"";
  const introBlock=`<tr><td style="padding:32px 32px 18px"><p style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#A31621;margin:0 0 12px">${template===0?"UMA NOTA PESSOAL":"ATIVIDADE DO IMÓVEL"}</p><h1 style="font-family:Georgia,serif;font-size:27px;line-height:1.25;color:#0D3B66;margin:0 0 11px">${escape(data.title)}</h1><p style="font-size:13px;color:#64748b;margin:0 0 24px">${escape(data.reference)} &nbsp;·&nbsp; ${escape(period)}</p><p style="font-size:16px;margin:0 0 12px">${escape(greeting)}</p><p style="line-height:1.75;font-size:15px;margin:0">${paragraphs(intro)}</p></td></tr>`;
  const signature=template===2?"":`<tr><td style="padding:20px 32px;border-top:1px solid #e8edf1">${consultant}</td></tr>`;
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#182638"><div style="display:none;max-height:0;overflow:hidden">${escape(subject)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:26px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e8edf1">${masthead}${headline}${introBlock}<tr><td align="right" style="padding:0 32px 3px">${mark}</td></tr>${sections}${settings.nextSteps.trim()?`<tr><td style="padding:18px 32px;background:#f3f6f8;border-left:4px solid #A31621"><h2 style="font-size:16px;color:#0D3B66;margin:0 0 10px">Próximos passos</h2><p style="line-height:1.65;margin:0">${paragraphs(settings.nextSteps)}</p></td></tr>`:""}<tr><td style="padding:22px 32px"><p style="line-height:1.6;margin:0 0 11px">${escape(closing)}</p><a style="color:#A31621;font-weight:bold" href="mailto:${escape(data.agentEmail)}?subject=${encodeURIComponent("Feedback · "+data.reference)}">Responder ao seu consultor →</a></td></tr>${signature}<tr><td style="padding:19px 32px;background:#0D3B66;color:#fff;font-size:13px;line-height:1.6"><p style="margin:0 0 8px">Pretende receber imóveis selecionados ou novidades da HousePro?</p><a href="${subscribe}" style="color:white;text-decoration:underline">Escolher o que deseja subscrever</a><p style="font-size:11px;color:#c9d5de;margin:9px 0 0">Subscrição facultativa, sujeita à sua confirmação.</p></td></tr></table><p style="font-size:11px;color:#72808f;max-width:580px;line-height:1.6">HousePro · Paixão pelo que fazemos &nbsp;·&nbsp; <a href="https://housepro.pt/privacidade" style="color:#72808f">Privacidade</a></p></td></tr></table></body></html>`;
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
    ...(settings.additionalEmail && settings.additionalEmail.toLowerCase()!==ownerEmail.toLowerCase()?{cc:[settings.additionalEmail]}:{}),
    bcc:[...new Set(bcc.map(value=>value.toLowerCase()))].filter(value=>value!==ownerEmail.toLowerCase()&&value!==settings.additionalEmail.toLowerCase()),
    subject:email.subject,text:email.text,...(settings.format==="html"?{html:email.html}:{}),
  };
}
