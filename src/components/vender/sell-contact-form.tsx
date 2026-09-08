"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PROPERTY_TYPES, PROPERTY_CONDITIONS } from "@/lib/valuation";

export function SellContactForm() {
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch("/api/valuation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, consent: form.get("consent") === "on", marketingConsent: form.get("marketingConsent") === "on", reason: "Estou a pensar vender", pageUrl: window.location.href, referrerUrl: document.referrer, utm: Object.fromEntries(new URLSearchParams(window.location.search)) }) });
    setState(res.ok ? "sent" : "error");
  }
  if (state === "sent") return <div className="rounded-2xl bg-white p-7 text-center text-[#0b1f3a]"><CheckCircle2 className="mx-auto size-9 text-[#198754]" /><h2 className="mt-3 font-display text-2xl">Pedido recebido.</h2><p className="mt-2 text-sm text-slate-600">Um consultor HousePro vai entrar em contacto consigo para perceber o imóvel e os seus objetivos.</p></div>;
  return <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-white p-5 text-[#0b1f3a] shadow-2xl sm:grid-cols-2 sm:p-7">
    <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#d62832]">Fale connosco</p><h2 className="mt-1 font-display text-2xl">Quer vender bem? Comecemos por conversar.</h2></div>
    <input required name="name" placeholder="O seu nome" className="h-12 rounded-xl border px-4 text-sm" />
    <input required name="phone" inputMode="tel" placeholder="Telefone" className="h-12 rounded-xl border px-4 text-sm" />
    <input name="email" type="email" placeholder="E-mail (opcional)" className="h-12 rounded-xl border px-4 text-sm" />
    <input required name="location" placeholder="Freguesia ou concelho do imóvel" className="h-12 rounded-xl border px-4 text-sm" />
    <select required name="propertyType" defaultValue="" className="h-12 rounded-xl border bg-white px-4 text-sm"><option value="" disabled>Tipo de imóvel</option>{PROPERTY_TYPES.map(x=><option key={x}>{x}</option>)}</select>
    <select required name="propertyCondition" defaultValue="" className="h-12 rounded-xl border bg-white px-4 text-sm"><option value="" disabled>Estado do imóvel</option>{PROPERTY_CONDITIONS.map(x=><option key={x}>{x}</option>)}</select>
    <select name="timeframe" defaultValue="" className="h-12 rounded-xl border bg-white px-4 text-sm sm:col-span-2"><option value="">Quando gostaria de vender? (opcional)</option><option>O mais rapidamente possível</option><option>Nos próximos três meses</option><option>Nos próximos seis meses</option><option>Estou apenas a planear</option></select>
    <textarea name="notes" placeholder="Há algo importante que devamos saber? (opcional)" className="min-h-24 rounded-xl border p-4 text-sm sm:col-span-2" />
    <label className="flex gap-2 text-xs leading-5 text-slate-600 sm:col-span-2"><input required name="consent" type="checkbox" className="mt-1" />Autorizo o tratamento dos meus dados para contacto sobre este pedido.</label>
    <label className="flex gap-2 text-xs leading-5 text-slate-600 sm:col-span-2"><input name="marketingConsent" type="checkbox" className="mt-1" />Quero receber informação e conteúdos úteis da HousePro (opcional).</label>
    {state === "error" && <p className="text-sm text-red-700 sm:col-span-2">Não foi possível enviar agora. Tente novamente.</p>}
    <button disabled={state === "sending"} className="hp-btn-red inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold disabled:opacity-60 sm:col-span-2">{state === "sending" ? "A enviar…" : "Pedir contacto"}<ArrowRight className="size-4" /></button>
  </form>;
}
