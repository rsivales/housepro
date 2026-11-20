"use client";

import { useEffect,useState } from "react";
import { ACTIVITY_SOURCES } from "@/lib/property-activity/model";

interface Kpis {
 visits:number;visitForms:number;proposalForms:number;clients:number;averageRating:number|null;proposedAmount:number;closedDeals:number;closedAmount:number;
 sources:{source:keyof typeof ACTIVITY_SOURCES;clients:number;documents:number}[];
 sentiment:{sentiment:string;count:number}[];
 properties:{reference:string;visits:number;proposals:number;rating:number|null}[];
}
const day=(date:Date)=>date.toISOString().slice(0,10);
function dates(period:string) {
 const now=new Date();
 const year=now.getFullYear(),month=now.getMonth();
 const start=period==="year"?new Date(Date.UTC(year,0,1)):period==="semester"?new Date(Date.UTC(year,month<6?0:6,1)):new Date(Date.UTC(year,month,1));
 return {from:day(start),until:day(new Date(Date.UTC(year,month,now.getDate())))};
}
const money=(n:number)=>new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
export function ActivityKpis() {
 const [period,setPeriod]=useState("month");
 const [range,setRange]=useState(()=>dates("month"));
 const [data,setData]=useState<Kpis>();
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;setData(undefined);setError("");
  void fetch("/api/property-activity/kpis?"+new URLSearchParams(range),{cache:"no-store"}).then(async response=>{
   const result=await response.json();if(!response.ok)throw new Error(result.error);if(active)setData(result);
  }).catch(e=>{if(active)setError(e.message);});
  return ()=>{active=false;};
 },[range]);
 const metrics=data?[
  ["Visitas realizadas",String(data.visits)],["Fichas de visita",String(data.visitForms)],["Fichas de proposta",String(data.proposalForms)],
  ["Clientes distintos nas fichas",String(data.clients)],["Avaliação média",data.averageRating===null?"Sem avaliações":`${data.averageRating} / 5`],
  ["Valores propostos nas fichas",money(data.proposedAmount)],["Negócios concluídos",String(data.closedDeals)],["Volume concluído",money(data.closedAmount)],
 ]:[];
 return <div className="mt-6 space-y-6">
  <div className="flex flex-wrap items-end gap-3">
   <label className="grid gap-1 text-sm">Período<select className="rounded-md border bg-card px-3 py-2" value={period} onChange={e=>{setPeriod(e.target.value);if(e.target.value!=="custom")setRange(dates(e.target.value));}}>
    <option value="month">Este mês</option><option value="semester">Este semestre</option><option value="year">Este ano</option><option value="custom">Personalizado</option>
   </select></label>
   <label className="grid gap-1 text-sm">Desde<input type="date" className="rounded-md border px-3 py-2" value={range.from} onChange={e=>{setPeriod("custom");setRange(v=>({...v,from:e.target.value}));}}/></label>
   <label className="grid gap-1 text-sm">Até (dia incluído)<input type="date" className="rounded-md border px-3 py-2" value={range.until} onChange={e=>{setPeriod("custom");setRange(v=>({...v,until:e.target.value}));}}/></label>
  </div>
  {error?<p role="status">{error}</p>:!data?<p>A calcular indicadores…</p>:<>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value])=><div className="rounded-xl border bg-card p-5" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
   <p className="text-xs leading-5 text-muted-foreground">As fichas são contabilizadas pela data confirmada do documento. Clientes distintos podem surgir em vários canais. Os valores propostos incluem propostas sucessivas. O volume concluído utiliza o marco de conclusão registado no CRM.</p>
   <section className="rounded-xl border bg-card p-5"><h2 className="font-display text-xl">Origem dos clientes</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Origem</th><th>Clientes distintos</th><th>Documentos</th></tr></thead><tbody>{data.sources.map(s=><tr className="border-t" key={s.source}><td className="py-3">{ACTIVITY_SOURCES[s.source]??s.source}</td><td>{s.clients}</td><td>{s.documents}</td></tr>)}</tbody></table></div>{!data.sources.length&&<p className="mt-3 text-sm text-muted-foreground">Sem fichas registadas neste período.</p>}</section>
   <section className="rounded-xl border bg-card p-5"><h2 className="font-display text-xl">Feedback dos imóveis</h2><div className="mt-3 flex flex-wrap gap-4 text-sm">{data.sentiment.map(s=><p key={s.sentiment}>{{positive:"Positivo",neutral:"Neutro",negative:"Negativo",unspecified:"Não indicado"}[s.sentiment]??s.sentiment} · {s.count}</p>)}</div>
    <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Imóvel</th><th>Fichas de visita</th><th>Propostas</th><th>Avaliação</th></tr></thead><tbody>{data.properties.map(p=><tr className="border-t" key={p.reference}><td className="py-3">{p.reference}</td><td>{p.visits}</td><td>{p.proposals}</td><td>{p.rating??"Sem avaliação"}</td></tr>)}</tbody></table></div>
   </section>
  </>}
 </div>;
}
