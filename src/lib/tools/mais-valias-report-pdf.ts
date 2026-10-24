import type { MvSubmission } from "@/lib/tools/mais-valias-funnel";
import type { MaisValiasResult } from "@/lib/tools/mais-valias-fiscal";

/** Minimal self-contained PDF 1.4 generator: two A4 pages, WinAnsi Helvetica.
 * No external font dependency or browser renderer. All coordinates are bounded.
 * Scenarios are never fabricated when the fiscal engine cannot substantiate them.
 */
const W = 595.28, H = 841.89;
const euro = (n: number) => new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " EUR";
const n = (v?: string) => { const t=String(v??"").replace(/[^0-9,.-]/g,""); return Number(t.includes(",")?t.replace(/\./g,"").replace(",","."):t)||0; };
const safe = (s: unknown) => String(s ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e\xa0-\xff]/g, "-").replace(/[()\\]/g, c => "\\"+c);
const byteString = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0) & 255);
const rgb = (r:number,g:number,b:number) => `${r} ${g} ${b} rg`;
const txt = (x:number,y:number,size:number,value:string,bold=false,color="0.09 0.17 0.24 rg") =>
  `BT /${bold?"F2":"F1"} ${size} Tf ${color} 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safe(value)}) Tj ET\n`;
const rect = (x:number,y:number,w:number,h:number,fill:string) => `${fill} ${x} ${y} ${w} ${h} re f\n`;
const wrap = (s:string,max=78) => {
  const out:string[]=[];let line="";
  for(const word of safe(s).split(/\s+/)){if((line+" "+word).trim().length>max && line){out.push(line);line=word;}else line=(line+" "+word).trim();}
  if(line)out.push(line);return out;
};
function page(s:MvSubmission,r:MaisValiasResult,english:boolean):string {
  let a=""; const left=48, right=547;
  a+=rect(0,H-9,W,9,rgb(.73,.08,.16));
  a+=txt(left,792,23,"HOUSEPRO",true,"0.73 0.08 0.16 rg");
  a+=txt(left,761,english?20:20,english?"PROPERTY CAPITAL GAINS REPORT":"RELATORIO DE MAIS-VALIAS",true);
  a+=txt(left,740,10,english?"Personalised indicative estimate":"Estimativa indicativa personalizada");
  a+=rect(left,681,right-left,42,"0.94 0.96 0.98 rg");
  a+=txt(left+12,707,11,(english?"Client: ":"Cliente: ")+(s.name||"-"),true);
  a+=txt(left+12,690,9,(english?"Purchase / sale years: ":"Anos de compra / venda: ")+(s.anoAquisicao||"-")+" / "+(s.anoVenda||"-"));
  a+=txt(left,651,14,english?"CALCULATION SUMMARY":"RESUMO DO CALCULO",true);
  const rows:[string,string][] = english ? [
    ["Purchase price",euro(n(s.valorAquisicao))],["Sale price",euro(n(s.valorVenda))],
    ["Adjusted acquisition",euro(r.aquisicaoCorrigida)],["Expenses considered",euro(r.despesasElegiveis)],
    ["Calculated capital gain",euro(r.maisValiaBruta)],["Potential taxable base",euro(r.baseTributavel)]
  ] : [
    ["Valor de aquisicao",euro(n(s.valorAquisicao))],["Valor de venda",euro(n(s.valorVenda))],
    ["Aquisicao corrigida",euro(r.aquisicaoCorrigida)],["Despesas consideradas",euro(r.despesasElegiveis)],
    ["Mais-valia apurada",euro(r.maisValiaBruta)],["Base potencialmente tributavel",euro(r.baseTributavel)]
  ];
  rows.forEach(([label,val],i)=>{const y=625-i*34;if(i%2===0)a+=rect(left,y-10,right-left,32,"0.96 0.97 0.98 rg");a+=txt(left+10,y,10,label,i===4);a+=txt(398,y,10,val,true);});
  a+=txt(left,404,12,english?"ASSUMPTIONS AND WARNINGS":"PRESSUPOSTOS E AVISOS",true);
  let yy=384;
  const warnings=r.notes.slice(0,4).flatMap(x=>wrap(x,94)).slice(0,7);
  for(const line of warnings){a+=txt(left+4,yy,8.4,line);yy-=13;}
  // Fixed card bottom position, independent of variable notes.
  a+=rect(left,131,right-left,133,"0.97 0.97 0.98 rg");
  a+=rect(left,259,right-left,5,"0.73 0.08 0.16 rg");
  a+=txt(left+13,239,14,english?"ESTIMATED TAX RANGE":"INTERVALO DE IMPOSTO ESTIMADO",true,"0.73 0.08 0.16 rg");
  const labels=english?["Optimistic","Balanced","Conservative"]:["Otimista","Equilibrado","Conservador"];
  const tax=r.impostoEstimado!==null && !r.needsAnalysis ? euro(r.impostoEstimado) : (english?"To be confirmed":"A confirmar");
  const vals=[english?"To be confirmed":"A confirmar",tax,english?"To be confirmed":"A confirmar"];
  [0,1,2].forEach(i=>{const x=left+14+i*165;a+=txt(x,202,10,labels[i],true);a+=txt(x,180,9,vals[i]);});
  a+=txt(left+13,149,8,english?"Scenario bounds require validated fiscal data; no amounts have been invented.":"Os limites dos cenarios exigem dados fiscais validados; nao foram inventados valores.");
  a+=txt(left,107,8,english?"Indicative only. Tax coefficients and legislation must be verified for the year of sale.":"Simulacao indicativa. Coeficientes e legislacao a validar para o ano da venda.");
  a+=txt(left,93,8,english?"Not tax advice or an official assessment.":"Nao substitui aconselhamento fiscal nem liquidacao oficial.");
  a+=rect(left,70,right-left,1,"0.86 0.89 0.91 rg");
  a+=txt(left,54,8,"HousePro  |  Paixao pelo que fazemos  |  "+r.engineVersion);
  return a;
}
export function generateMaisValiasPdf(s:MvSubmission,r:MaisValiasResult):Uint8Array {
  const objects:string[]=[];
  const add=(x:string)=>{objects.push(x);return objects.length;};
  const catalog=add("<< /Type /Catalog /Pages 2 0 R >>");
  const pages=add("<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const stream1=page(s,r,false);
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>`);
  add(`<< /Length ${byteString(stream1).length} >>\nstream\n${stream1}endstream`);
  const stream2=page(s,r,true);
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 8 0 R >>`);
  add(`<< /Length ${byteString(stream2).length} >>\nstream\n${stream2}endstream`);
  void catalog;void pages;
  let out="%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";const offsets=[0];
  objects.forEach((o,i)=>{offsets.push(byteString(out).length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const start=byteString(out).length;
  out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(v=>out+=String(v).padStart(10,"0")+" 00000 n \n");
  out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return byteString(out);
}
