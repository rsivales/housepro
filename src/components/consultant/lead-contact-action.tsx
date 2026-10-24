"use client";
import { useState } from "react";
export function LeadContactAction({leadId,contacted}:{leadId:string;contacted:boolean}) {
 const [done,setDone]=useState(contacted),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(){setBusy(true);setError("");try {const res=await fetch(`/api/leads/${leadId}/contacted`,{method:"POST"});if(!res.ok)throw new Error();setDone(true);}catch{setError("Não foi possível guardar. Tente novamente.");}finally{setBusy(false);}}
 return <div><button type="button" disabled={done||busy} onClick={save} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{done?"Contacto registado":busy?"A guardar…":"Marcar como contactado"}</button>{error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
