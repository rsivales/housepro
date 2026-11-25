export const OCCASION_COPY: Record<string, { subject: string; body: string }> = {
  natal: { subject: "Um Natal cheio de bons momentos, {nome} | HousePro", body: "Olá {nome},\n\nNesta época especial, desejamos-lhe dias tranquilos, momentos felizes e uma casa cheia de boas memórias.\n\nObrigado por fazer parte da nossa história.\n\nFeliz Natal e um excelente Ano Novo!\nEquipa HousePro" },
  pascoa: { subject: "Uma Páscoa feliz, {nome} | HousePro", body: "Olá {nome},\n\nQue esta Páscoa traga renovação, serenidade e bons momentos junto de quem mais gosta.\n\nCom os melhores votos,\nEquipa HousePro" },
  carnaval: { subject: "Um Carnaval cheio de alegria | HousePro", body: "Olá {nome},\n\nDesejamos-lhe um Carnaval com muita cor, alegria e bons momentos para recordar.\n\nEquipa HousePro" },
  abril_25: { subject: "Celebramos a liberdade | HousePro", body: "Olá {nome},\n\nNeste 25 de Abril, celebramos a liberdade, a esperança e a possibilidade de construir um futuro melhor.\n\nUm feliz Dia da Liberdade!\nEquipa HousePro" },
  halloween: { subject: "Um Halloween divertido, {nome} | HousePro", body: "Olá {nome},\n\nQue hoje não faltem sorrisos, criatividade e histórias divertidas — sem sustos com a casa!\n\nFeliz Halloween!\nEquipa HousePro" },
  santos_populares: { subject: "Bons Santos Populares! | HousePro", body: "Olá {nome},\n\nÉ tempo de celebrar as nossas tradições, os reencontros e as noites de verão.\n\nDesejamos-lhe excelentes Santos Populares!\nEquipa HousePro" },
  dia_mae: { subject: "Um dia especial para todas as mães | HousePro", body: "Olá {nome},\n\nHoje celebramos o carinho, a dedicação e todas as formas de cuidar.\n\nUm feliz Dia da Mãe!\nEquipa HousePro" },
  dia_pai: { subject: "Um dia especial para todos os pais | HousePro", body: "Olá {nome},\n\nHoje celebramos os laços, os ensinamentos e as memórias que ficam para sempre.\n\nUm feliz Dia do Pai!\nEquipa HousePro" },
  aniversario: { subject: "Feliz aniversário, {nome}! | HousePro", body: "Olá {nome},\n\nHoje é o seu dia! Desejamos-lhe um aniversário feliz, cheio de saúde, alegria e bons momentos.\n\nQue o novo ano de vida lhe traga tudo o que mais deseja.\n\nParabéns!\nEquipa HousePro" },
};
export function occasionCopy(occasion: string, audience: string) {
  const base = OCCASION_COPY[occasion] ?? OCCASION_COPY.natal;
  if (audience === "consultores") return { ...base, body: base.body.replace("Equipa HousePro", "A direção HousePro") };
  if (audience === "brokers") return { ...base, body: base.body.replace("Equipa HousePro", "A direção HousePro") };
  return base;
}
export function escapeEmailHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function premiumEmailHtml(subject: string, body: string, logoUrl?: string) {
  const safeSubject = escapeEmailHtml(subject.replaceAll("{nome}", "Ana"));
  const safeBody = escapeEmailHtml(body.replaceAll("{nome}", "Ana")).replace(/\n/g, "<br>");
  const logo = logoUrl && /^https:\/\//.test(logoUrl) ? `<img src="${escapeEmailHtml(logoUrl)}" alt="HousePro" width="205" style="display:block;max-width:205px;height:auto;border:0">` : '<span style="font-size:26px;font-weight:800;letter-spacing:2px;color:#fff">HOUSEPRO</span>';
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#10243e"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2f5f8;padding:28px 12px"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#0D3B66;padding:30px 38px;border-bottom:5px solid #A31621">${logo}</td></tr><tr><td style="padding:42px 38px 30px"><p style="color:#A31621;font-size:11px;letter-spacing:2px;font-weight:700;margin:0 0 15px">HOUSEPRO · PAIXÃO PELO QUE FAZEMOS</p><h1 style="font-size:27px;line-height:1.25;margin:0 0 26px;color:#0D3B66">${safeSubject}</h1><div style="font-size:16px;line-height:1.85;color:#34455a">${safeBody}</div></td></tr><tr><td style="padding:23px 38px;background:#f7f9fb;border-top:1px solid #e8edf2"><p style="font-size:12px;line-height:1.7;color:#64748b;margin:0">HousePro · Algarve<br>Paixão pelo que fazemos</p></td></tr></table></td></tr></table></body></html>`;
}
