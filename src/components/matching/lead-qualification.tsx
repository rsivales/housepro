"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateForm } from "@/components/crm/contacts-manager";
export function LeadQualification({ id, name, phone, email, zone, source, readOnly }: { id: string; name: string; phone?: string; email?: string; zone?: string; source?: string; readOnly?: boolean }) {
 const [open,setOpen]=useState(false), router=useRouter();
 return <section className="mt-4 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Ficha e qualificação do comprador</h2><p className="mt-2 text-sm text-muted-foreground">Guarde a ficha associada a esta lead para gerir necessidades, prazo de compra, venda/permuta e sugestões de imóveis.</p><button disabled={readOnly} className="mt-3 rounded-full border px-4 py-2 text-sm disabled:opacity-50" onClick={()=>setOpen(!open)}>Qualificar / ler ficha por fotografia</button>{open&&<CreateForm leadId={id} initial={{name,phone,email,zone,source}} onCreated={c=>{router.push(`/app/contactos/${c.id}`);router.refresh();}}/>}</section>;
}
