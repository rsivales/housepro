"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function LeadContactAction({leadId,contacted}:{leadId:string;contacted:boolean}){
 const router=useRouter(),[done,setDone]=useState(contacted),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){setBusy(true);setError('');try{const r=await fetch(`/api/leads/${leadId}/contacted`,{method:'POST'});if(!r.ok)throw new Error();setDone(true);window.dispatchEvent(new Event('helix:lead-followup'));router.refresh();}catch{setError('Não foi possível guardar. Tente novamente.');}finally{setBusy(false);}}
 return <div><p className="mb-2 text-sm text-muted-foreground">Marcar como lida confirma apenas a leitura. Depois de contactar o cliente, registe o contacto aqui para atualizar o acompanhamento e o Dashboard.</p><button type="button" disabled={done||busy} onClick={save} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{done?'Contacto registado':busy?'A guardar…':'Marcar como contactado'}</button>{error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
