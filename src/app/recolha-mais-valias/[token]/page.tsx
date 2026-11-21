"use client";
import * as React from "react";
import Link from "next/link";
import {useParams} from "next/navigation";

const questions=[
  ["rendimentoColetavel","Rendimento coletável anual sem esta venda (€)"],
  ["rendimentoConjuge","Rendimento coletável anual do cônjuge, se declarar em conjunto (€)"],
  ["dependentes","Número de dependentes"],
] as const;
const checks=[
  ["tributacaoConjunta","Tributação conjunta com cônjuge ou unido de facto"],
  ["domicilioFiscal12Meses","A casa vendida foi domicílio fiscal nos últimos 12 meses"],
  ["reinvestimentoNoPrazo","Reinvestimento até 24 meses antes ou 36 meses depois da venda"],
  ["reinvestimentoFundosProprios","Reinvestimento com capitais próprios e intenção declarada no IRS"],
  ["apoioPublicoRelevante","Houve apoio público relevante na aquisição ou em obras"],
  ["outroGanhoMesmoAno","Há outras mais-valias ou menos-valias imobiliárias no mesmo ano"],
  ["situacaoEspecial","Há reforma/65 anos ou outra situação fiscal especial"],
] as const;
export default function IntakePage(){
  const {token}=useParams<{token:string}>();
  const [name,setName]=React.useState("");const [valid,setValid]=React.useState<boolean|null>(null);const [answers,setAnswers]=React.useState<Record<string,string|boolean>>({});const [consent,setConsent]=React.useState(false);const [status,setStatus]=React.useState("");const [done,setDone]=React.useState(false);
  React.useEffect(()=>{fetch(`/api/mais-valias/recolha/${encodeURIComponent(token)}`,{cache:"no-store"}).then(async r=>{const j=await r.json();setValid(r.ok);setName(j.name??"");}).catch(()=>setValid(false));},[token]);
  async function send(e:React.FormEvent){e.preventDefault();setStatus("A guardar…");try{const r=await fetch(`/api/mais-valias/recolha/${encodeURIComponent(token)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers,consent})});const j=await r.json();if(!r.ok)throw new Error(j.error);setDone(true);setStatus("");}catch(e){setStatus(e instanceof Error?e.message:"Falha ao guardar.");}}
  return <main className="mx-auto max-w-2xl px-5 py-12"><img src="/brand/housepro-designer-red.png" alt="HousePro" width="190" height="70" className="h-auto"/><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-widest text-red-700">Clínica de Finanças · HousePro</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Dados para a simulação de mais-valias</h1>{valid===null?<p className="mt-5">A verificar a ligação…</p>:!valid?<p className="mt-5">Esta ligação expirou ou já foi utilizada. Contacte o seu consultor para obter outra.</p>:done?<p className="mt-5">Obrigado. Os seus dados foram guardados para o consultor preparar a análise. Pode fechar esta página.</p>:<form onSubmit={send} className="mt-6 space-y-5"><p>Olá {name||""}. Responda apenas ao que souber. Pode transmitir estes dados diretamente ao seu consultor por telefone ou em consulta na agência. Nunca introduza credenciais do Portal das Finanças.</p><p className="text-sm text-slate-600">O rendimento coletável consta da nota de liquidação do IRS. Para uma venda futura, indique uma previsão para o ano da venda, excluindo a mais-valia desta operação.</p>{questions.map(([key,label])=><label key={key} className="block text-sm font-medium">{label}<input inputMode="decimal" value={String(answers[key]??"")} onChange={e=>setAnswers(a=>({...a,[key]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3"/></label>)}<div className="space-y-3">{checks.map(([key,label])=><label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={answers[key]===true} onChange={e=>setAnswers(a=>({...a,[key]:e.target.checked}))} className="mt-1"/>{label}</label>)}</div><label className="flex items-start gap-2 rounded-lg bg-slate-50 p-4 text-sm"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/><span>Autorizo a HousePro a usar estes dados para preparar e comunicar a simulação de mais-valias solicitada, segundo a <Link className="underline" href="/privacidade">Política de Privacidade</Link>. Esta autorização é facultativa.</span></label>{status&&<p role="alert" className="text-sm text-red-700">{status}</p>}<button type="submit" className="rounded-lg bg-[#A31621] px-6 py-3 font-semibold text-white">Enviar ao consultor</button></form>}</div></main>;
}
