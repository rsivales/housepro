"use client";
import { Suspense,useState,type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function SubscribeContent(){
  const params=useSearchParams();
  const [state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setState("sending");
    const fields=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/subscricao",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        name:fields.get("name"),email:fields.get("email"),offers:fields.get("offers")==="on",news:fields.get("news")==="on",consent:fields.get("consent")==="on",agencyId:params.get("agencia"),
      })});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Não foi possível enviar a confirmação.");
      setState("done");
    }catch(error){setMessage(error instanceof Error?error.message:"Ocorreu um erro.");setState("error");}
  }
  return <main className="mx-auto max-w-xl px-5 py-16 text-slate-800">
    <Link href="/"><Image src="/brand/housepro-red.png" alt="HousePro" width={170} height={57} className="h-auto w-44"/></Link>
    <h1 className="mt-10 font-display text-3xl">Receba o Guia HousePro</h1>
    {params.get("estado")==="confirmado"?<p className="mt-5 rounded-xl bg-emerald-50 p-5">Subscrição confirmada. Obrigado por escolher a HousePro.</p>:
      params.get("estado")==="invalido"?<p className="mt-5 rounded-xl bg-amber-50 p-5">O link expirou ou já foi utilizado. Faça um novo pedido abaixo.</p>:null}
    <p className="mt-3 text-sm leading-6">Só enviaremos informação sobre os temas que selecionar, depois de confirmar o pedido no seu email. Pode <Link href="/subscrever/cancelar" className="underline">cancelar a subscrição</Link> a qualquer momento.</p>
    {state==="done"?<p className="mt-6 rounded-xl bg-emerald-50 p-5">Enviámos uma mensagem para confirmar a sua subscrição. Verifique o email e clique no link nas próximas 48 horas.</p>:
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border p-6">
      <label className="block text-sm">Nome (opcional)<input name="name" maxLength={120} className="mt-1 w-full rounded-md border px-3 py-2"/></label>
      <label className="block text-sm">Email<input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded-md border px-3 py-2"/></label>
      <fieldset className="space-y-3 text-sm"><legend className="mb-3 font-medium">Quero receber</legend>
        <label className="flex gap-2"><input name="offers" type="checkbox"/>Oportunidades e imóveis selecionados</label>
        <label className="flex gap-2"><input name="news" type="checkbox" defaultChecked/>Novidades e informações da HousePro{params.get("agencia")?" e da agência local":""}</label>
      </fieldset>
      <label className="flex gap-2 text-sm"><input name="consent" type="checkbox" required/>Aceito receber emails sobre os temas selecionados. Li a <Link href="/privacidade" className="underline">política de privacidade</Link>.</label>
      {state==="error"&&<p role="alert" className="text-sm text-red-700">{message}</p>}
      <button disabled={state==="sending"} className="rounded-md bg-[#A31621] px-5 py-3 font-semibold text-white disabled:opacity-50">{state==="sending"?"A enviar…":"Pedir subscrição"}</button>
    </form>}
  </main>;
}
export default function SubscribePage(){return <Suspense fallback={<p className="p-8">A carregar…</p>}><SubscribeContent/></Suspense>;}
