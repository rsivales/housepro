"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { CreateForm } from "@/components/crm/contacts-manager";
export function LeadQualification({ id, name, phone, email, zone, source, seller, readOnly }: { id: string; name: string; phone?: string; email?: string; zone?: string; source?: string; seller?: boolean; readOnly?: boolean }) {
 const [open,setOpen]=useState(false), [busy,setBusy]=useState(false),[error,setError]=useState(""),[existing,setExisting]=useState(""),router=useRouter();
 async function convert() {
  setBusy(true);setError("");
  try {
   const r=await fetch("/api/contacts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({leadId:id,name,phone,email,zone,source,type:seller?"vendedor":"comprador"})});
   const d=await r.json();if(!r.ok)throw new Error(d.error || "Não foi possível criar a ficha.");
   if(d.exists){setExisting(d.contact.id);router.refresh();}else {router.push(`/app/contactos/${d.contact.id}`);router.refresh();}
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível guardar.");}finally{setBusy(false);}
 }
 return <section className="mt-4 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Ficha do {seller?"proprietário":"comprador"}</h2><p className="mt-2 text-sm text-muted-foreground">Crie ou associe a ficha com os dados do pedido, origem, perguntas e respostas. O histórico completo fica guardado no contacto.</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={readOnly||busy} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={convert}>{busy?"A guardar…":"Criar / associar contacto num clique"}</button><button disabled={readOnly||busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-50" onClick={()=>setOpen(!open)}>Rever dados / ler fotografia</button></div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{existing&&<p role="status" className="mt-3 text-sm">O contacto já existia e foi associado sem duplicação. <Link className="underline" href={`/app/contactos/${existing}`}>Abrir ficha</Link></p>}{open&&<CreateForm leadId={id} initial={{name,phone,email,zone,source,type:seller?"vendedor":"comprador"}} onCreated={c=>{router.push(`/app/contactos/${c.id}`);router.refresh();}}/>}</section>;
}
