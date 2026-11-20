"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { REPORT_OPENINGS, REPORT_NEXT_STEPS } from "@/lib/owner-reports/messages";
import { DEFAULT_REPORT, REPORT_SECTIONS, REPORT_TEMPLATES, type ReportSettings } from "@/lib/owner-reports/model";

type Property={id:string;reference:string;title:string;owner_name:string|null;owner_email:string|null};
type Config={property_id:string;agent_id:string;revision:string;settings:ReportSettings;next_at:string};
type History={id:string;property_id:string;kind:string;state:string;period_end:string;error_code:string|null};
interface PanelData {properties:Property[];settings:Config[];history:History[];agentEmail:string;agentId:string}
const field="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
export function OwnerReportsPanel() {
  const params=useSearchParams();
  const [data,setData]=useState<PanelData>();
  const [selected,setSelected]=useState(params.get("imovel")??"");
  const [settings,setSettings]=useState<ReportSettings>(DEFAULT_REPORT);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [preview,setPreview]=useState<{html:string;text:string;subject:string;to:string;replyTo:string;bcc:string[];broker:string|null}>();
  const load=useCallback(async()=>{
    const response=await fetch("/api/owner-reports",{cache:"no-store"});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error);
    setData(result);
    return result as PanelData;
  },[]);
  useEffect(()=>{void load().catch(e=>setMessage(e.message));},[load]);
  const agentId=data?.agentId;
  const config=data?.settings.find(s=>s.property_id===selected);
  const property=data?.properties.find(p=>p.id===selected);
  useEffect(()=>{
    setSettings(config && config.agent_id===agentId?config.settings:DEFAULT_REPORT);
    setPreview(undefined);
  },[selected,config,agentId]);
  function patch(value:Partial<ReportSettings>) {setSettings(v=>({...v,...value}));setPreview(undefined);}
  async function action(kind:"preview"|"save") {
    if(!property)return;
    setLoading(true);setMessage("");
    try{
      const response=await fetch("/api/owner-reports",{
        method:kind==="preview"?"POST":"PUT",headers:{"content-type":"application/json"},
        body:JSON.stringify({propertyId:property.id,settings,revision:config?.revision??null}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      if(kind==="preview")setPreview(result);
      else {await load();setMessage(settings.enabled?"Relatórios ativos. A próxima data de envio está indicada abaixo.":"Envios pausados.");}
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível concluir.");}
    finally{setLoading(false);}
  }
  const missing=data?.properties.filter(p=>!data.settings.some(s=>s.property_id===p.id && s.agent_id===data.agentId)).length??0;
  return <div className="mt-6">
    {message&&<p role="status" className="mb-4 rounded-lg border p-3 text-sm">{message}</p>}
    {!data?<p>A carregar configuração…</p>:<>
      {missing>0&&<p className="mb-5 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm">Configuração necessária em {missing} {missing===1?"imóvel":"imóveis"}. Selecione cada imóvel e guarde as opções de envio.</p>}
      <label className="block max-w-xl text-sm font-medium">Imóvel
        <select className={field} value={selected} onChange={e=>{setSelected(e.target.value);setMessage("");}}>
          <option value="">Selecionar imóvel</option>
          {data.properties.map(p=><option value={p.id} key={p.id}>{p.reference} · {p.title}{data.settings.some(s=>s.property_id===p.id && s.agent_id===data.agentId)?"":" · Configurar"}</option>)}
        </select>
      </label>
      {!data.properties.length&&<p className="mt-5 text-sm">Sem imóveis ativos a configurar.</p>}
      {property&&<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="space-y-5 rounded-xl border bg-card p-5">
          <div className="text-sm">
            <p>Proprietário · {property.owner_name||"Nome por preencher"}</p>
            <p>Enviar para · {property.owner_email||"Email por preencher"}</p>
            <p>Respostas para · {data.agentEmail||"Complete o email no seu perfil"}</p>
            <Link href={`/app/imovel/${property.id}/editar`} className="mt-2 inline-block underline">Completar dados do proprietário</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Periodicidade<select className={field} value={settings.frequency} onChange={e=>patch({frequency:e.target.value as ReportSettings["frequency"]})}>
              <option value="monthly">Mensal</option><option value="fortnightly">A cada 14 dias</option><option value="weekly">Semanal</option>
            </select></label>
            {settings.frequency==="monthly"&&<label className="text-sm">Dia do mês (1 a 28)<input type="number" min="1" max="28" className={field} value={settings.day} onChange={e=>patch({day:Number(e.target.value)})}/></label>}
            <label className="text-sm">Formato<select className={field} value={settings.format} onChange={e=>patch({format:e.target.value as ReportSettings["format"]})}>
              <option value="html">Email com apresentação visual</option><option value="text">Email em texto simples</option>
            </select></label>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium">Apresentação inicial</legend>
            <div className="grid gap-2">{REPORT_TEMPLATES.map((name,i)=><label key={name} className="flex gap-2 rounded-lg border p-3 text-sm">
              <input type="radio" name="template" checked={settings.template===i} onChange={()=>patch({template:i})}/>{name}
            </label>)}</div>
          </fieldset>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.rotate} onChange={e=>patch({rotate:e.target.checked})}/>Alternar entre os três modelos nos próximos envios</label>
          <fieldset><legend className="mb-2 text-sm font-medium">Informação a incluir</legend>
            <div className="grid gap-2">{Object.entries(REPORT_SECTIONS).map(([key,label])=><label key={key} className="flex gap-2 text-sm">
              <input type="checkbox" checked={settings.sections.includes(key as keyof typeof REPORT_SECTIONS)} onChange={e=>patch({sections:e.target.checked?[...settings.sections,key as keyof typeof REPORT_SECTIONS]:settings.sections.filter(s=>s!==key)})}/>{label}
            </label>)}</div>
          </fieldset>
          <label className="block text-sm">Sugestão de abertura
            <select className={field} value="" onChange={e=>patch({introduction:e.target.value})}>
              <option value="">Escolher mensagem pronta</option>
              {REPORT_OPENINGS.map(item=><option key={item.label} value={item.text}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">Mensagem de abertura personalizada<textarea className={field} rows={3} maxLength={2000} value={settings.introduction} onChange={e=>patch({introduction:e.target.value})}/></label>
          <label className="block text-sm">Sugestão de próximos passos
            <select className={field} value="" onChange={e=>patch({nextSteps:e.target.value})}>
              <option value="">Escolher sugestão pronta</option>
              {REPORT_NEXT_STEPS.map(item=><option key={item.label} value={item.text}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">Próximos passos a comunicar<textarea className={field} rows={3} maxLength={2000} value={settings.nextSteps} onChange={e=>patch({nextSteps:e.target.value})}/></label>
          {config&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={e=>patch({enabled:e.target.checked})}/>Envio automático ativo</label>}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={loading} onClick={()=>void action("preview")} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Pré-visualizar</button>
            <button type="button" disabled={loading} onClick={()=>void action("save")} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{config?"Guardar opções":"Guardar e ativar"}</button>
          </div>
          {config&&<p className="text-sm text-muted-foreground">{config.settings.enabled?`Próximo envio a partir de ${new Date(config.next_at).toLocaleString("pt-PT")}`:"Envio pausado."}</p>}
        </section>
        <section className="min-w-0 rounded-xl border bg-card p-5">
          <h2 className="font-display text-xl">Pré-visualização</h2>
          {preview?<>
            <p className="mt-3 text-sm font-medium">{preview.subject}</p>
            <div className="my-3 space-y-1 text-xs text-muted-foreground">
              <p>Destinatário · {preview.to||"Email por preencher"}</p>
              <p>Responder a · {preview.replyTo||"Email por preencher"}</p>
              <p>Cópia oculta · {preview.bcc.join(", ")||"Sem destinatários"}</p>
              <p>Resumo separado ao broker · {preview.broker||"Broker por configurar na agência"}</p>
            </div>
            {settings.format==="html"?<iframe title="Relatório ao proprietário" sandbox="" srcDoc={preview.html} className="h-[760px] w-full rounded-md border bg-white"/>:<pre className="whitespace-pre-wrap break-words text-sm leading-7">{preview.text}</pre>}
          </>:<p className="mt-3 text-sm text-muted-foreground">Escolha as opções e clique em Pré-visualizar para ver os dados reais do imóvel.</p>}
          <h2 className="mt-8 font-display text-xl">Envios recentes</h2>
          <ul className="mt-3 space-y-3 text-sm">{data.history.filter(h=>h.property_id===property.id).map(h=><li key={h.id} className="rounded-md border p-3">
            {h.kind==="owner"?"Proprietário":"Resumo ao broker"} · {new Date(h.period_end).toLocaleDateString("pt-PT")}<br/>
            {{pending:"Aguarda envio",accepted:"Aceite pelo serviço de email",failed:"Envio falhou — requer verificação",cancelled:"Cancelado"}[h.state]??h.state}
          </li>)}</ul>
          {!data.history.some(h=>h.property_id===property.id)&&<p className="mt-2 text-sm text-muted-foreground">Ainda sem envios.</p>}
        </section>
      </div>}
    </>}
  </div>;
}
