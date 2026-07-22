"use client";

import * as React from "react";
import { Check, Loader2, Send, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_CONSULTOR_PCT } from "@/lib/data/referrals";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ReferralDialog({
  propertyId,
  reference,
  toName,
  fromId,
}: {
  propertyId: string;
  reference: string;
  /** Consultor destino (angariador do imóvel). */
  toName: string;
  /** Consultor atual (origem). */
  fromId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    clientName: "",
    clientContact: "",
    sharePct: MIN_CONSULTOR_PCT,
    note: "",
    consent: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.clientName.trim() || !form.clientContact.trim()) {
      setError("Indique o nome e contacto do cliente.");
      return;
    }
    if (!form.consent) {
      setError("Confirme o consentimento do cliente (RGPD).");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "consultor",
          propertyId,
          fromId,
          clientName: form.clientName,
          clientContact: form.clientContact,
          sharePct: Math.max(MIN_CONSULTOR_PCT, form.sharePct),
          note: form.note || undefined,
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
      <Button variant="outline" size="sm" className="w-full" onClick={() => { setDone(false); setOpen(true); }}>
        <Users className="size-4" /> Enviar referência
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="font-display text-lg">Enviar referência</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-md hover:bg-secondary" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-success/15 text-success"><Check className="size-6" /></div>
                <p className="font-medium">Referência enviada a {toName}</p>
                <p className="text-sm text-muted-foreground">
                  Fica pendente até {toName} aceitar. Podes acompanhar em{" "}
                  <span className="font-medium text-foreground">Referências</span>.
                </p>
                <Button className="mt-2" onClick={() => setOpen(false)}>Fechar</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 overflow-auto px-5 py-5">
                <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                  Referência para <span className="font-medium text-foreground">{toName}</span> · Imóvel{" "}
                  <span className="font-medium text-foreground">{reference}</span>
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="rf-name">Nome do cliente</Label>
                  <Input id="rf-name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rf-contact">Contacto do cliente</Label>
                  <Input id="rf-contact" value={form.clientContact} onChange={(e) => setForm({ ...form, clientContact: e.target.value })} placeholder="Telefone ou email" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">A minha percentagem</span>
                    <span className="text-primary font-semibold">{form.sharePct}%</span>
                  </div>
                  <input
                    type="range" min={MIN_CONSULTOR_PCT} max={50} value={form.sharePct}
                    onChange={(e) => setForm({ ...form, sharePct: Number(e.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mínimo garantido {MIN_CONSULTOR_PCT}%. Podes propor mais — {toName} aceita, rejeita ou contrapõe.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rf-note">Nota (opcional)</Label>
                  <textarea id="rf-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={box} placeholder="Contexto do cliente, orçamento, preferências…" />
                </div>

                <label htmlFor="rf-consent" className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <input id="rf-consent" type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-primary" />
                  <span>Confirmo que o cliente autorizou a partilha dos seus dados com outro consultor HousePro (RGPD).</span>
                </label>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending && <Loader2 className="size-4 animate-spin" />}
                  <Send className="size-4" /> Enviar a {toName}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
