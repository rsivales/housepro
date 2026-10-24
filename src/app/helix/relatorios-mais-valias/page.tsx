"use client";

import { useEffect, useState } from "react";

type ReportLead={id:string;name:string;email:string|null;created_at:string;email_status:string|null;hasReport:boolean};
export default function RelatoriosMaisValiasPage() {
  const [leads,setLeads]=useState<ReportLead[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [sending,setSending]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const endpoint="/api/helix/mais-valias-report";
  async function refresh(){
    setLoading(true);
    try{
      const res=await fetch(endpoint,{cache:"no-store"});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error||"Falha ao carregar relatórios");
      setLeads(body.leads||[]);
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[]);
  async function send(lead:ReportLead){
    if(!lead.email || !confirm(`Enviar o relatório de mais-valias para ${lead.email}?`))return;
    setSending(lead.id);setNotice("");
    try{
      const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({leadId:lead.id})});
      const body=await res.json();
      if(!res.ok)throw new Error(body.message||body.error||"Falha no envio");
      setNotice(`Relatório enviado para ${lead.email}.`);
      await refresh();
    }catch(e){setNotice(e instanceof Error?e.message:"Erro ao enviar");}
    finally{setSending(null);}
  }
  return <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
    <div className="mb-8"><p className="text-sm font-semibold uppercase tracking-widest text-red-700">HousePro · Helix</p>
      <h1 className="mt-2 text-3xl font-bold">Relatórios de mais-valias</h1>
      <p className="mt-2 text-slate-600">Pré-visualize, descarregue e envie PDFs bilingues aos clientes. Os relatórios antigos sem dados estruturados necessitam de nova simulação.</p></div>
    <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Pedidos recebidos</h2>
      <button className="rounded-lg border px-4 py-2 hover:bg-slate-100" onClick={()=>void refresh()}>Atualizar</button></div>
    {notice&&<p role="status" className="mb-4 rounded-lg bg-slate-100 p-3">{notice}</p>}
    {error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {loading?<p>A carregar…</p>:leads.length===0?<p className="rounded-lg border p-6">Não existem pedidos de simulação disponíveis para esta conta.</p>:
      <div className="space-y-3">{leads.map(lead=><section key={lead.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-bold">{lead.name}</h3><p className="text-sm text-slate-600">{lead.email||"Sem email"} · {new Date(lead.created_at).toLocaleDateString("pt-PT")}</p>
            <p className="mt-1 text-xs text-slate-500">Email: {lead.email_status||"pendente"}</p></div>
          {lead.hasReport?<div className="flex flex-wrap gap-2">
            <a className="rounded-lg border border-slate-300 px-3 py-2 text-sm" target="_blank" rel="noopener noreferrer" href={`${endpoint}?leadId=${encodeURIComponent(lead.id)}`}>Pré-visualizar PDF</a>
            <a className="rounded-lg border border-slate-300 px-3 py-2 text-sm" download={`HousePro-Mais-Valias-${lead.id}.pdf`} href={`${endpoint}?leadId=${encodeURIComponent(lead.id)}`}>Descarregar PDF</a>
            <button disabled={!lead.email||sending===lead.id} onClick={()=>void send(lead)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sending===lead.id?"A enviar…":"Enviar ao cliente"}</button>
          </div>:<span className="text-sm text-amber-700">Simulação antiga: dados insuficientes para gerar PDF</span>}
        </div>
      </section>)}</div>}
  </main>;
}
