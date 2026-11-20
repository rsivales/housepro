"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function OwnerReportSetupGate() {
  const path=usePathname();
  const dialog=useRef<HTMLDialogElement>(null);
  const [missing,setMissing]=useState(0);
  const allowed=path?.startsWith("/app/relatorios-proprietario") ||
    path?.startsWith("/app/perfil") || path?.startsWith("/app/imovel/");
  useEffect(()=>{
    if(allowed)return;
    let active=true;
    void fetch("/api/owner-reports",{cache:"no-store"}).then(async response=>{
      if(!response.ok)return;
      const data=await response.json();
      if(active)setMissing(data.properties.filter((p:{id:string})=>!data.settings.some((s:{property_id:string;agent_id:string})=>s.property_id===p.id && s.agent_id===data.agentId)).length);
    }).catch(()=>{});
    return ()=>{active=false;};
  },[path,allowed]);
  useEffect(()=>{
    if(!allowed && missing)dialog.current?.showModal();
    else dialog.current?.close();
  },[allowed,missing]);
  if(allowed||!missing)return null;
  return <dialog ref={dialog} onCancel={event=>event.preventDefault()} aria-labelledby="owner-report-setup" className="m-auto max-w-lg rounded-2xl bg-card p-7 text-foreground shadow-xl backdrop:bg-black/50">
      <h2 id="owner-report-setup" className="font-display text-2xl">Ative os relatórios aos proprietários</h2>
      <p className="mt-3 text-sm leading-6">Tem {missing} {missing===1?"imóvel por configurar":"imóveis por configurar"}. Confirme o email do proprietário, escolha o modelo e guarde a periodicidade para começar a comunicar a atividade.</p>
      <Link autoFocus href="/app/relatorios-proprietario" className="mt-5 inline-block rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Configurar relatórios</Link>
  </dialog>;
}
