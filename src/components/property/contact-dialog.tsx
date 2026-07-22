"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Check, Loader2, MessageSquare, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadIntent } from "@/lib/data/leads";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ContactDialog({
  propertyId,
  referrerId,
  reference,
}: {
  propertyId: string;
  referrerId?: string;
  reference: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [intent, setIntent] = React.useState<LeadIntent>("mensagem");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    contact: "",
    email: "",
    preferredAt: "",
    message: "",
    consent: false,
  });

  function show(next: LeadIntent) {
    setIntent(next);
    setDone(false);
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.contact.trim()) {
      setError("Indique o nome e um contacto.");
      return;
    }
    if (!form.consent) {
      setError("É necessário o consentimento RGPD.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ref: referrerId,
          intent,
          name: form.name,
          contact: form.contact,
          email: form.email || undefined,
          preferredAt: intent === "visita" ? form.preferredAt || undefined : undefined,
          message: form.message || undefined,
          consent: form.consent,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => show("mensagem")}>
          <MessageSquare className="size-4" /> Mensagem
        </Button>
        <Button variant="outline" size="sm" onClick={() => show("visita")}>
          <CalendarClock className="size-4" /> Pedir visita
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="font-display text-lg">
                {intent === "visita" ? "Pedir visita" : "Deixar mensagem"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md hover:bg-secondary"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
                  <Check className="size-6" />
                </div>
                <p className="font-medium">Pedido enviado</p>
                <p className="text-sm text-muted-foreground">
                  O consultor dedicado entrará em contacto consigo em breve
                  {intent === "visita" ? " para confirmar a visita." : "."}
                </p>
                <Button className="mt-2" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 overflow-auto px-5 py-5">
                {/* Intenção */}
                <div className="grid grid-cols-2 gap-2">
                  {(["mensagem", "visita"] as LeadIntent[]).map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setIntent(it)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        intent === it
                          ? "border-primary bg-primary/5 font-medium text-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      {it === "visita" ? "Pedir visita" : "Deixar mensagem"}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ld-name">Nome</Label>
                  <Input
                    id="ld-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="O seu nome"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ld-contact">Telefone</Label>
                    <Input
                      id="ld-contact"
                      type="tel"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="9XX XXX XXX"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ld-email">Email (opcional)</Label>
                    <Input
                      id="ld-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="nome@email.pt"
                    />
                  </div>
                </div>

                {intent === "visita" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ld-when">Data/hora preferida</Label>
                    <input
                      id="ld-when"
                      type="datetime-local"
                      value={form.preferredAt}
                      onChange={(e) => setForm({ ...form, preferredAt: e.target.value })}
                      className={box}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="ld-msg">Mensagem</Label>
                  <textarea
                    id="ld-msg"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={box}
                    placeholder={
                      intent === "visita"
                        ? "Ex.: tenho preferência por fins de semana de manhã."
                        : "A sua mensagem sobre este imóvel…"
                    }
                  />
                  <p className="text-xs text-muted-foreground">Ref. {reference}</p>
                </div>

                {/* RGPD */}
                <label
                  htmlFor="ld-consent"
                  className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <input
                    id="ld-consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                  />
                  <span>
                    Autorizo o tratamento dos meus dados para ser contactado sobre
                    este pedido, nos termos da{" "}
                    <Link
                      href="/privacidade"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Política de Privacidade
                    </Link>
                    . (RGPD)
                  </span>
                </label>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending && <Loader2 className="size-4 animate-spin" />}
                  {intent === "visita" ? "Enviar pedido de visita" : "Enviar mensagem"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
