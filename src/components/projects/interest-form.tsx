"use client";

import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";

export function InterestForm({ kind, projectId, projectName }: { kind: "international" | "development"; projectId: string; projectName: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "ok" | "error">("idle");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/project-interest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, projectId, projectName, name: form.get("name"), email: form.get("email"), phone: form.get("phone"), message: form.get("message") }) });
    setState(response.ok ? "ok" : "error");
  }
  if (state === "ok") return <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-4 text-sm"><CheckCircle2 className="size-5" /> Pedido enviado. O responsável entrará em contacto consigo.</div>;
  return <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
    <input required name="name" placeholder="O seu nome" className="rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm placeholder:text-white/65" />
    <input required type="email" name="email" placeholder="Email" className="rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm placeholder:text-white/65" />
    <input name="phone" placeholder="Telefone (opcional)" className="rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm placeholder:text-white/65" />
    <input name="message" placeholder="O que pretende saber?" className="rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm placeholder:text-white/65" />
    <button disabled={state === "sending"} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary disabled:opacity-70"><Send className="size-4" />{state === "sending" ? "A enviar…" : "Pedir informações"}</button>
    {state === "error" && <p className="sm:col-span-2 text-sm text-red-100">Não foi possível enviar agora. Tente novamente.</p>}
  </form>;
}
