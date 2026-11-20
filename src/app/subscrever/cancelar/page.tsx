"use client";
import { Suspense,useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CancelSubscriptionContent(){
  const params=useSearchParams();
  const token=params.get("token")??"";
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(payload:object){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/subscricao/cancelar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      setMessage(token?"Subscrição cancelada. Não receberá emails destas listas.":"Se esse email estiver subscrito, receberá uma mensagem para confirmar o cancelamento.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível concluir o pedido.");}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-xl px-5 py-16 text-slate-800"><Link href="/" className="font-semibold">HousePro</Link>
    <h1 className="mt-8 font-display text-3xl">Cancelar subscrição</h1>
    <p className="mt-3 text-sm">Deixará de receber informações sobre imóveis e novidades da HousePro. Os emails relacionados com negócios ou serviços mantêm-se separados.</p>
    {token?<button disabled={busy||message.startsWith("Subscrição cancelada")} onClick={()=>void submit({action:"confirm",token})} className="mt-6 rounded-md bg-[#A31621] px-5 py-3 font-semibold text-white">Confirmar cancelamento</button>:
    <form onSubmit={e=>{e.preventDefault();void submit({email});}} className="mt-6 space-y-4">
      <label className="block text-sm">O seu email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2"/></label>
      <button disabled={busy} className="rounded-md bg-[#A31621] px-5 py-3 font-semibold text-white">Enviar confirmação</button>
    </form>}
    {message&&<p role="status" className="mt-5 text-sm">{message}</p>}
  </main>;
}
export default function CancelSubscriptionPage(){return <Suspense fallback={<p className="p-8">A carregar…</p>}><CancelSubscriptionContent/></Suspense>;}
