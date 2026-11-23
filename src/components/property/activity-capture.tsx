"use client";

import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ACTIVITY_SOURCES,EMPTY_ACTIVITY,parseActivityText,type ActivityInput } from "@/lib/property-activity/model";
import { readActivityDocument } from "@/lib/property-activity/ocr-client";
import type { LeadPipeline } from "@/lib/data/lead-pipelines";

interface ActivityRecord {
 id:string;kind:string;occurred_at:string;document_name:string;contact_id:string;lead_id:string;deal_id:string|null;
 listing_agent:{name:string}|null;buyer_agent:{name:string}|null;data:ActivityInput;rating:number|null;sentiment:string;
}
interface Workspace {history:ActivityRecord[];property:{reference:string;title:string};agents:{id:string;name:string;agency:string}[];pipelines:LeadPipeline[];canWrite:boolean}
const field="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
export function ActivityCapture({properties,initialId}:{properties:{id:string;reference:string;title:string}[];initialId:string}) {
 const [propertyId,setPropertyId]=useState(initialId);
 const [workspace,setWorkspace]=useState<Workspace>();
 const [form,setForm]=useState<ActivityInput>(EMPTY_ACTIVITY);
 const [file,setFile]=useState<File>();
 const [preview,setPreview]=useState("");
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<{contactId:string;leadId:string;dealId?:string;exists:boolean}>();
 const camera=useRef<HTMLInputElement>(null),upload=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  setWorkspace(undefined);setFile(undefined);setForm({...EMPTY_ACTIVITY});setResult(undefined);setStatus("");
  if(!propertyId)return;
  let active=true;
  void fetch(`/api/property-activity?propertyId=${propertyId}`,{cache:"no-store"}).then(async r=>{
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   if(active)setWorkspace(data);
  }).catch(e=>{if(active)setStatus(e.message);});
  return ()=>{active=false;};
 },[propertyId]);
 useEffect(()=>{
  if(!file){setPreview("");return;}
  const url=URL.createObjectURL(file);setPreview(url);
  return ()=>URL.revokeObjectURL(url);
 },[file]);
 const patch=(value:Partial<ActivityInput>)=>setForm(v=>({...v,...value,confirmed:false}));
 async function read(source?:File) {
  if(!source)return;
  setStatus("");setResult(undefined);
  if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(source.type)||source.size>4*1024*1024){
   setStatus("Use PDF, JPG, PNG ou WebP até 4 MB. Pode fotografar a ficha em formato compatível.");return;
  }
  setFile(source);setBusy(true);
  setForm(current=>({...EMPTY_ACTIVITY,kind:current.kind,pipeline:current.pipeline,stage:current.stage}));
  try {
   const text=await readActivityDocument(source,setStatus);
   const suggestion=parseActivityText(text);
   const normalized=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
   suggestion.participants=suggestion.participants?.map(person=>{
    const matching=workspace?.agents.filter(agent=>normalized(agent.name)===normalized(person.name));
    return matching?.length===1?{...person,profileId:matching[0].id,agency:person.agency||matching[0].agency}:person;
   });
   setForm(current=>({...current,...suggestion,confirmed:false}));
   setStatus("Leitura concluída. Os campos identificados foram preenchidos abaixo. Compare com o original antes de confirmar, sobretudo manuscritos, nomes, números e datas.");
  }catch(error){setStatus((error instanceof Error?error.message:"Não foi possível ler o documento.")+" Pode preencher a ficha manualmente e guardar a cópia selecionada.");}
  finally{setBusy(false);if(upload.current)upload.current.value="";if(camera.current)camera.current.value="";}
 }
 async function save() {
  if(!file)return;
  setBusy(true);setStatus("");
  try {
   const payload=new FormData();payload.set("propertyId",propertyId);payload.set("document",file);payload.set("data",JSON.stringify(form));
   const response=await fetch("/api/property-activity",{method:"POST",body:payload});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   setResult(data);setStatus(data.exists?"O documento já estava gravado. Foi aberto o registo existente.":"Documento e ficha guardados no histórico, com ligação ao contacto e ao CRM.");
   const refreshed=await fetch(`/api/property-activity?propertyId=${propertyId}`,{cache:"no-store"});
   if(refreshed.ok)setWorkspace(await refreshed.json());
  }catch(error){setStatus(error instanceof Error?error.message:"Não foi possível guardar.");}
  finally{setBusy(false);}
 }
 const pipeline=workspace?.pipelines.find(p=>p.key===form.pipeline);
 const updateParticipant=(index:number,key:keyof ActivityInput["participants"][number],value:string)=>patch({
  participants:form.participants.map((p,i)=>i===index?{...p,[key]:value}:p),
 });
 return <div className="mt-6 space-y-6">
  <label className="block max-w-2xl text-sm font-medium">Imóvel<select className={field} disabled={busy} value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
   <option value="">Selecionar imóvel</option>{properties.map(p=><option key={p.id} value={p.id}>{p.reference} · {p.title}</option>)}
  </select></label>
  {status&&<p role="status" className="rounded-lg border bg-card p-4 text-sm">{status}</p>}
  {workspace&&<>
   {workspace.canWrite&&<section className="space-y-5 rounded-xl border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
     <label className="text-sm">Tipo de documento<select className={field} disabled={busy} value={form.kind} onChange={e=>patch({kind:e.target.value as ActivityInput["kind"],stage:e.target.value==="visit"?2:3})}>
      <option value="visit">Ficha de visita</option><option value="proposal">Proposta</option>
     </select></label>
     <div className="flex flex-wrap gap-2">
      <button className="rounded-md border px-4 py-2 text-sm" disabled={busy} onClick={()=>camera.current?.click()}>Tirar fotografia</button>
      <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" disabled={busy} onClick={()=>upload.current?.click()}>Carregar documento</button>
     </div>
    </div>
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={e=>void read(e.target.files?.[0])}/>
    <input ref={upload} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={e=>void read(e.target.files?.[0])}/>
    <p className="text-xs text-muted-foreground">PDF até 12 páginas ou fotografia, até 4 MB. A leitura decorre no dispositivo. A cópia é guardada no histórico quando confirmar a ficha.</p>
    {file&&<div className="space-y-3 rounded-lg border p-3"><p className="text-sm font-medium">Original para conferência · {file.name}</p>
     {preview&&(file.type==="application/pdf"?<iframe className="h-[480px] w-full rounded border" title="Documento original selecionado" src={preview}/>:<Image className="max-h-[620px] w-full rounded object-contain" alt="Fotografia original da ficha selecionada" src={preview} width={1200} height={1600} unoptimized/>)}
    </div>}
    <details><summary className="cursor-pointer text-sm font-medium">Texto extraído do documento</summary>
     <textarea className={field} rows={7} maxLength={50000} value={form.rawText} onChange={e=>patch({rawText:e.target.value})}/>
     <button className="mt-2 rounded-md border px-3 py-2 text-sm" disabled={busy||!form.rawText} onClick={()=>patch(parseActivityText(form.rawText))}>Voltar a sugerir campos a partir do texto</button>
    </details>
    <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 font-display text-xl">Cliente e origem</legend>
     <label className="text-sm">Nome do cliente<input className={field} value={form.name} onChange={e=>patch({name:e.target.value})}/></label>
     <label className="text-sm">Telefone, se indicado<input className={field} type="tel" value={form.phone} onChange={e=>patch({phone:e.target.value})}/></label>
     <label className="text-sm">Email, se indicado<input className={field} type="email" value={form.email} onChange={e=>patch({email:e.target.value})}/></label>
     <p className="text-xs text-muted-foreground sm:col-span-2">Para ligar a ficha ao contacto e ao CRM basta um telefone ou email confirmado. Não tente adivinhar caracteres ilegíveis.</p>
     <label className="text-sm">NIF, se indicado<input className={field} value={form.nif} onChange={e=>patch({nif:e.target.value})}/></label>
     <label className="text-sm sm:col-span-2">Morada, se indicada<input className={field} value={form.address} onChange={e=>patch({address:e.target.value})}/></label>
     <label className="text-sm">Data da {form.kind==="visit"?"visita":"proposta"}<input className={field} type="date" value={form.occurredAt?new Date(Date.parse(form.occurredAt)-new Date(form.occurredAt).getTimezoneOffset()*60000).toISOString().slice(0,10):""} onChange={e=>patch({occurredAt:e.target.value?new Date(e.target.value+"T12:00").toISOString():"",timeKnown:false})}/></label>
     <label className="text-sm">Hora, quando indicada na ficha<input className={field} type="time" disabled={!form.occurredAt} value={form.timeKnown&&form.occurredAt?new Date(Date.parse(form.occurredAt)-new Date(form.occurredAt).getTimezoneOffset()*60000).toISOString().slice(11,16):""} onChange={e=>{
      const date=new Date(Date.parse(form.occurredAt)-new Date(form.occurredAt).getTimezoneOffset()*60000).toISOString().slice(0,10);
      patch({occurredAt:new Date(date+"T"+(e.target.value||"12:00")).toISOString(),timeKnown:Boolean(e.target.value)});
     }}/></label>
     <label className="text-sm">Canal de origem<select className={field} value={form.source} onChange={e=>patch({source:e.target.value as ActivityInput["source"]})}>{Object.entries(ACTIVITY_SOURCES).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
     <label className="text-sm sm:col-span-2">Detalhe da origem, campanha ou recomendação<input className={field} value={form.originDetail} onChange={e=>patch({originDetail:e.target.value})}/></label>
    </fieldset>
    <fieldset className="space-y-4 border-t pt-4"><legend className="pr-2 font-display text-xl">Agentes envolvidos</legend>
     <label className="block text-sm">Consultor interno do comprador<select className={field} value={form.buyerAgentId} onChange={e=>patch({buyerAgentId:e.target.value})}>
      <option value="">O consultor que está a registar a ficha</option>{workspace.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
     </select></label>
     <p className="text-xs text-muted-foreground">O angariador é associado a partir do imóvel. Registe abaixo outros intervenientes internos ou de agências parceiras.</p>
     {form.participants.map((p,i)=><div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="text-sm">Nome<input className={field} value={p.name} onChange={e=>updateParticipant(i,"name",e.target.value)}/></label>
      <label className="text-sm">Papel na visita ou proposta<input className={field} value={p.role} onChange={e=>updateParticipant(i,"role",e.target.value)}/></label>
      <label className="text-sm">Agência<input className={field} value={p.agency} onChange={e=>updateParticipant(i,"agency",e.target.value)}/></label>
      <label className="text-sm">Associar a consultor interno<select className={field} value={p.profileId} onChange={e=>{
       const agent=workspace.agents.find(a=>a.id===e.target.value);
       patch({participants:form.participants.map((item,index)=>index===i?{...item,profileId:agent?.id??"",name:agent?.name??item.name,agency:agent?.agency??item.agency}:item)});
      }}><option value="">Interveniente externo / sem associação</option>{workspace.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="text-sm">Telefone<input className={field} value={p.phone} onChange={e=>updateParticipant(i,"phone",e.target.value)}/></label>
      <label className="text-sm">Email<input className={field} value={p.email} onChange={e=>updateParticipant(i,"email",e.target.value)}/></label>
      <button type="button" className="text-left text-sm underline" onClick={()=>patch({participants:form.participants.filter((_,n)=>n!==i)})}>Remover interveniente</button>
     </div>)}
     <button type="button" className="rounded-md border px-3 py-2 text-sm" disabled={form.participants.length>=12} onClick={()=>patch({participants:[...form.participants,{name:"",role:"",agency:"",phone:"",email:"",profileId:""}]})}>Adicionar interveniente</button>
    </fieldset>
    <fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-2"><legend className="pr-2 font-display text-xl">Feedback do imóvel</legend>
     <label className="text-sm">Avaliação do cliente<select className={field} value={form.sentiment} onChange={e=>patch({sentiment:e.target.value as ActivityInput["sentiment"]})}>
      <option value="unspecified">Não indicada</option><option value="positive">Positiva</option><option value="neutral">Neutra</option><option value="negative">Negativa</option>
     </select></label>
     <label className="text-sm">Pontuação de 1 a 5, se indicada<select className={field} value={form.rating??""} onChange={e=>patch({rating:e.target.value?Number(e.target.value):null})}>
      <option value="">Não indicada</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
     </select></label>
     <label className="text-sm sm:col-span-2">Feedback completo do cliente<textarea className={field} rows={4} value={form.feedback} onChange={e=>patch({feedback:e.target.value})}/></label>
     <label className="text-sm sm:col-span-2">Resumo para o proprietário, sem identificação do cliente<textarea className={field} rows={3} value={form.ownerFeedback} onChange={e=>patch({ownerFeedback:e.target.value})}/></label>
     <label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.shareOwner} onChange={e=>patch({shareOwner:e.target.checked})}/>Incluir este resumo nos relatórios automáticos ao proprietário</label>
    </fieldset>
    {form.kind==="proposal"&&<fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-2"><legend className="pr-2 font-display text-xl">Condições da proposta</legend>
     <label className="text-sm">Valor proposto (€)<input type="number" min="0" step="0.01" className={field} value={form.amount??""} onChange={e=>patch({amount:e.target.value?Number(e.target.value):null})}/></label>
     <label className="text-sm">Sinal previsto (€)<input type="number" min="0" step="0.01" className={field} value={form.deposit??""} onChange={e=>patch({deposit:e.target.value?Number(e.target.value):null})}/></label>
     <label className="text-sm">Financiamento<select className={field} value={form.financing} onChange={e=>patch({financing:e.target.value})}><option value="por_definir">Por definir</option><option value="credito">Crédito</option><option value="capitais_proprios">Capitais próprios</option><option value="misto">Misto</option></select></label>
     <label className="text-sm">Validade da proposta<input type="date" className={field} value={form.validUntil} onChange={e=>patch({validUntil:e.target.value})}/></label>
     <label className="text-sm">Data pretendida para escritura<input type="date" className={field} value={form.closingDate} onChange={e=>patch({closingDate:e.target.value})}/></label>
     <label className="text-sm sm:col-span-2">Condições e observações da proposta<textarea rows={4} className={field} value={form.conditions} onChange={e=>patch({conditions:e.target.value})}/></label>
    </fieldset>}
    <fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-2"><legend className="pr-2 font-display text-xl">Destino no CRM</legend>
     <label className="text-sm">Pipeline para novos pedidos<select className={field} value={form.pipeline} onChange={e=>patch({pipeline:e.target.value,stage:0})}>{workspace.pipelines.map(p=><option value={p.key} key={p.key}>{p.label}</option>)}</select></label>
     <label className="text-sm">Etapa inicial<select className={field} value={form.stage} onChange={e=>patch({stage:Number(e.target.value)})}>{pipeline?.stages.map((name,index)=><option value={index} key={index}>{name}</option>)}</select></label>
     <p className="text-xs text-muted-foreground sm:col-span-2">Se já existir um pedido ou negócio deste cliente e imóvel, a ficha fica ligada a esse histórico. Fases avançadas e condições de negócios existentes são preservadas.</p>
    </fieldset>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.confirmed} onChange={e=>setForm(v=>({...v,confirmed:e.target.checked}))}/>Confirmei os dados extraídos, a data, os agentes e a informação a partilhar.</label>
    <button type="button" disabled={!file||!form.confirmed||busy} onClick={()=>void save()} className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?"A processar…":"Guardar documento e registar atividade"}</button>
    {result&&<div className="flex flex-wrap gap-4 text-sm"><Link className="underline" href={`/app/contactos/${result.contactId}`}>Abrir contacto</Link><Link className="underline" href={`/app/leads/${result.leadId}`}>Abrir pedido no CRM</Link>{result.dealId&&<Link className="underline" href={`/app/crm/${result.dealId}`}>Abrir negócio</Link>}</div>}
   </section>}
   <section className="rounded-xl border bg-card p-5">
    <h2 className="font-display text-2xl">Histórico de fichas e documentos</h2>
    {!workspace.history.length&&<p className="mt-3 text-sm text-muted-foreground">Ainda sem fichas de visita ou propostas carregadas.</p>}
    <div className="mt-4 space-y-3">{workspace.history.map(item=><details key={item.id} className="rounded-lg border p-4">
     <summary className="cursor-pointer text-sm font-medium">{item.kind==="visit"?"Ficha de visita":"Proposta"} · {new Date(item.occurred_at).toLocaleDateString("pt-PT")} · {item.data.name}</summary>
     <div className="mt-3 space-y-2 text-sm">
      <p>{item.data.phone}{item.data.email?` · ${item.data.email}`:""}</p>
      {item.data.feedback&&<p className="whitespace-pre-wrap">{item.data.feedback}</p>}
      {item.data.conditions&&<p className="whitespace-pre-wrap">{item.data.conditions}</p>}
      {item.data.amount&&<p>Valor proposto · {item.data.amount.toLocaleString("pt-PT")} €</p>}
      <p>Angariador · {item.listing_agent?.name??"Consultar imóvel"} · Consultor do comprador · {item.buyer_agent?.name??"Consultar registo"}</p>
      <p>Outros intervenientes · {item.data.participants.map(p=>`${p.name} (${p.role})`).join(", ")||"Angariador e consultor do registo"}</p>
      {item.data.shareOwner&&<p>Resumo para o proprietário · {item.data.ownerFeedback}</p>}
      <details className="rounded border p-3"><summary className="cursor-pointer font-medium">Ver documento original · {item.document_name}</summary><iframe className="mt-3 h-[520px] w-full rounded border" title={`Original: ${item.document_name}`} src={`/api/property-activity/document?id=${item.id}`}/></details>
      <div className="flex flex-wrap gap-4"><a className="underline" href={`/api/property-activity/document?id=${item.id}&download=1`}>Descarregar original</a><Link className="underline" href={`/app/leads/${item.lead_id}`}>Ver pedido</Link>{item.deal_id&&<Link className="underline" href={`/app/crm/${item.deal_id}`}>Ver negócio</Link>}</div>
     </div>
    </details>)}</div>
   </section>
  </>}
 </div>;
}
