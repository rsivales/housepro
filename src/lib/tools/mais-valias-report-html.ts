import type { MvSubmission } from "@/lib/tools/mais-valias-funnel";
import type { MaisValiasResult } from "@/lib/tools/mais-valias-fiscal";

/** Printable, email-safe A4 report. All user-controlled strings are escaped. */
const escapeHtml = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c
);
const money = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const numberFromForm = (value?: string) => {
  const raw = String(value ?? "").replace(/[^\d,.-]/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized) || 0;
};

export function buildMaisValiasHtml(s: MvSubmission, r: MaisValiasResult): string {
  const name = escapeHtml(s.name?.trim() || "Cliente");
  const acquisition = numberFromForm(s.valorAquisicao);
  const sale = numberFromForm(s.valorVenda);
  const rows: Array<[string, string, string]> = [
    ["Valor de aquisição", "Purchase price", money(acquisition)],
    ["Valor de venda", "Sale price", money(sale)],
    ["Aquisição corrigida", "Adjusted purchase price", money(r.aquisicaoCorrigida)],
    ["Despesas consideradas", "Eligible expenses", money(r.despesasElegiveis)],
    ["Mais-valia apurada", "Calculated capital gain", money(r.maisValiaBruta)],
    ["Base potencialmente tributável", "Potentially taxable amount", money(r.baseTributavel)],
  ];
  const detailRows = rows.map(([pt, en, value]) =>
    `<tr><td><strong>${pt}</strong><span>${en}</span></td><td>${escapeHtml(value)}</td></tr>`
  ).join("");
  const notes = r.notes.map(n => `<li>${escapeHtml(n)}</li>`).join("");
  const hasReliableTax = !r.needsAnalysis && r.impostoEstimado !== null;
  // The current fiscal engine does not calculate three independently validated scenarios.
  // Never fabricate optimistic/balanced/conservative numbers.
  const balanced = hasReliableTax ? money(r.impostoEstimado!) : "A confirmar / To be confirmed";
  const pending = "A confirmar / To be confirmed";
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HousePro — Relatório de mais-valias / Capital gains report</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f1f4f7;color:#152b3e;font:14px/1.55 Arial,Helvetica,sans-serif}
.sheet{max-width:794px;margin:24px auto;padding:46px 48px;background:white;box-shadow:0 10px 38px #162a3d1c}
.brand{color:#d7192c;font-size:25px;font-weight:900;letter-spacing:2px}.brand small{font-size:11px;color:#71818e;letter-spacing:1px}
.rule{height:5px;background:#d7192c;width:72px;margin:18px 0 28px}h1{font-size:30px;line-height:1.15;margin:0 0 8px}
.subtitle{font-size:16px;color:#526879;margin:0 0 24px}.eyebrow{color:#b51b2c;font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase}
.meta{background:#f3f6f9;border-radius:12px;padding:18px 22px;margin:20px 0 26px}.meta p{margin:3px 0}
h2{font-size:17px;margin:28px 0 10px}table{border-collapse:collapse;width:100%;table-layout:fixed}
td{padding:11px 8px;border-bottom:1px solid #e4eaf0;vertical-align:top}td:last-child{text-align:right;font-weight:700;white-space:nowrap}
td span{display:block;font-size:11px;color:#64798b}ul{padding-left:19px}li{margin-bottom:5px}
.tax-card{border:2px solid #d7192c;border-radius:14px;margin-top:32px;padding:22px;break-inside:avoid}
.tax-card h2{margin:0 0 5px;color:#ba1b2e;font-size:20px}.tax-card .en{font-size:12px;color:#64798b}
.scenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
.scenario{background:#f3f6f9;border-radius:10px;padding:12px 8px;min-width:0;text-align:center}
.scenario strong{display:block;font-size:12px}.scenario span{display:block;font-size:11px;color:#667889}.scenario b{display:block;font-size:14px;overflow-wrap:anywhere;margin-top:7px}
.disclaimer{font-size:11px;color:#586a79;margin-top:22px;line-height:1.55}
.footer{border-top:1px solid #e2e7ec;margin-top:24px;padding-top:14px;font-size:11px;color:#64798b}
@media(max-width:600px){.sheet{padding:25px 18px;margin:0}.scenarios{grid-template-columns:1fr}td:last-child{white-space:normal}h1{font-size:25px}}
@page{size:A4;margin:14mm}
@media print{body{background:white}.sheet{width:auto;max-width:none;margin:0;padding:0;box-shadow:none}.scenarios{grid-template-columns:repeat(3,minmax(0,1fr))}h1,h2,.tax-card,tr{break-inside:avoid}}
</style></head><body><main class="sheet">
<div class="brand">HOUSEPRO <small>®</small></div><div class="rule"></div>
<div class="eyebrow">Relatório personalizado / Personalised report</div>
<h1>Simulação de Mais-Valias</h1><p class="subtitle">Property Capital Gains Estimate</p>
<section class="meta"><p><strong>Cliente / Client:</strong> ${name}</p>
<p><strong>Aquisição / Purchase:</strong> ${escapeHtml(s.anoAquisicao)}</p>
<p><strong>Venda / Sale:</strong> ${escapeHtml(s.anoVenda)}</p>
<p><strong>Ano fiscal do motor / Tax model year:</strong> ${r.fiscalYear}</p></section>
<h2>Resumo do cálculo / Calculation summary</h2><table><tbody>${detailRows}</tbody></table>
<h2>Pressupostos e observações / Assumptions and notes</h2><ul>${notes}</ul>
<section class="tax-card"><h2>Intervalo de imposto estimado</h2>
<div class="en">Estimated tax range</div>
<div class="scenarios">
<div class="scenario"><strong>Otimista</strong><span>Optimistic</span><b>${pending}</b></div>
<div class="scenario"><strong>Equilibrado</strong><span>Balanced</span><b>${escapeHtml(balanced)}</b></div>
<div class="scenario"><strong>Conservador</strong><span>Conservative</span><b>${pending}</b></div>
</div><p class="disclaimer">Os cenários ainda não podem ser calculados com segurança a partir dos dados recolhidos. O valor equilibrado, quando disponível, é uma aproximação pela taxa marginal indicada, não uma liquidação de IRS.<br>
The scenarios cannot yet be calculated reliably from the information collected. Where shown, the balanced figure is a marginal-rate approximation, not a final income-tax assessment.</p></section>
<p class="disclaimer"><strong>Nota importante / Important:</strong> Simulação meramente indicativa; coeficientes de desvalorização e regras fiscais sujeitos a validação para o ano da venda. Não substitui aconselhamento fiscal nem a liquidação da Autoridade Tributária.<br>
Indicative estimate only; inflation adjustment coefficients and tax rules must be verified for the sale year. This is not tax advice or an official tax assessment.</p>
<div class="footer">HousePro · Paixão pelo que fazemos / Passion for what we do · ${escapeHtml(r.engineVersion)}</div>
</main></body></html>`;
}
