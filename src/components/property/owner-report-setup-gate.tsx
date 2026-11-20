"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function OwnerReportSetupGate() {
  const path=usePathname();
  const dialog=useRef<HTMLDialogElement>(null);
  const [missing,setMissing]=useState(0);
  const [deadline,setDeadline]=useState("");
  const [now,setNow]=useState(Date.now());
  const [dismissed,setDismissed]=useState(false);
  const allowed=path?.startsWith("/app/relatorios-proprietario") ||
    path?.startsWith("/app/perfil") || path?.startsWith("/app/imovel/") ||
    path?.startsWith("/app/atividade-imovel");
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return ()=>window.clearInterval(timer);},[]);
  useEffect(()=>{
    let active=true;
    void fetch("/api/owner-reports",{cache:"no-store"}).then(async response=>{
      if(!response.ok)return;
      const data=await response.json();
      if(active){
        setMissing(data.properties.filter((p:{id:string})=>!data.settings.some((s:{property_id:string;agent_id:string})=>s.property_id===p.id && s.agent_id===data.agentId)).length);
        setDeadline(data.graceUntil??"");
        setDismissed(Boolean(data.graceUntil&&sessionStorage.getItem(`owner-report-dismissed:${data.graceUntil}`)));
      }
    }).catch(()=>{});
    return ()=>{active=false;};
  },[path]);
  const remaining=deadline?Date.parse(deadline)-now:0;
  const expired=Boolean(deadline&&remaining<=0);
  const dismiss=()=>{if(expired)return;setDismissed(true);sessionStorage.setItem(`owner-report-dismissed:${deadline}`,"1");dialog.current?.close();};
  useEffect(()=>{
    if(!allowed && missing && deadline && (expired||!dismissed))dialog.current?.showModal();
    else dialog.current?.close();
  },[allowed,missing,deadline,expired,dismissed]);
  if(allowed||!missing||!deadline)return null;
  const days=Math.max(0,Math.floor(remaining/86400000));
  const hours=Math.max(0,Math.ceil(remaining%86400000/3600000));
  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();dismiss();}} aria-labelledby="owner-report-setup" className="m-auto max-w-lg rounded-2xl bg-card p-7 text-foreground shadow-xl backdrop:bg-black/50">
      <h2 id="owner-report-setup" className="font-display text-2xl">Relatórios aos proprietários</h2>
      <p className="mt-3 text-sm leading-6">Tem {missing} {missing===1?"imóvel por configurar":"imóveis por configurar"}. Pode carregar fichas de visita e atualizar a informação dos imóveis durante os próximos cinco dias.</p>
      <p className="mt-3 rounded-md bg-amber-500/10 p-3 text-sm font-semibold">{expired?"Prazo terminado. Configure os relatórios para voltar a usar o Helix.":`Tempo restante: ${days} d ${hours} h · até ${new Date(deadline).toLocaleString("pt-PT")}`}</p>
      <p className="mt-3 text-sm">Após este prazo, o acesso às restantes áreas do Helix ficará bloqueado até concluir a configuração.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link autoFocus href="/app/relatorios-proprietario" className="inline-block rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Configurar relatórios</Link>
      {!expired&&<button type="button" onClick={dismiss} className="rounded-md border px-5 py-3 text-sm">Continuar no Helix</button>}</div>
  </dialog>;
}
