"use client";
import { Suspense,useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmSubscriptionContent(){
  const token=useSearchParams().get("token")??"";
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function confirm(){
    setBusy(true);
    try{
      const response=await fetch("/api/subscricao/confirmar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      setMessage("Subscrição confirmada. Obrigado por escolher a HousePro.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível confirmar.");}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-xl px-5 py-16 text-slate-800"><Link href="/" className="font-semibold">HousePro</Link>
    <h1 className="mt-8 font-display text-3xl">Confirmar subscrição</h1>
    <p className="mt-3 text-sm">Confirme para começar a receber os temas que escolheu. Se não fez este pedido, pode fechar esta página.</p>
    <button disabled={busy||!token||message.startsWith("Subscrição confirmada")} onClick={()=>void confirm()} className="mt-6 rounded-md bg-[#A31621] px-5 py-3 font-semibold text-white">Confirmar subscrição</button>
    {message&&<p role="status" className="mt-5 text-sm">{message}</p>}
  </main>;
}
export default function ConfirmSubscriptionPage(){return <Suspense fallback={<p className="p-8">A carregar…</p>}><ConfirmSubscriptionContent/></Suspense>;}
