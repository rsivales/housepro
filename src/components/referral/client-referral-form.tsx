"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Check, Gift, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agencyById } from "@/lib/data/mock";
import { MIN_CLIENTE_PCT, agencyForMunicipality } from "@/lib/data/referrals";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ClientReferralForm() {
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    fromName: "",
    fromContact: "",
    clientName: "",
    clientContact: "",
    purpose: "comprar" as "comprar" | "vender",
    municipality: "",
    note: "",
    consent: false,
  });

  const agency = form.municipality.trim()
    ? agencyById(agencyForMunicipality(form.municipality))
    : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.clientName.trim() || !form.clientContact.trim()) {
      setError("Indique o nome e contacto de quem está a indicar.");
      return;
    }
    if (!form.consent) {
      setError("É necessário o consentimento (RGPD).");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "cliente",
          fromName: form.fromName || undefined,
          fromContact: form.fromContact || undefined,
          purpose: form.purpose,
          clientName: form.clientName,
          clientContact: form.clientContact,
          municipality: form.municipality || undefined,
          note: form.note || undefined,
          sharePct: MIN_CLIENTE_PCT,
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

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-6" />
        </div>
        <p className="mt-3 font-medium">Indicação enviada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Encaminhámos a sua indicação{agency ? ` para a ${agency.name}` : ""}. Um consultor
          entrará em contacto. Obrigado — recebe no mínimo {MIN_CLIENTE_PCT}% quando o negócio
          se concretizar.
        </p>
        <Link
          href="/cliente/indicacoes"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Acompanhar a minha indicação
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-sm text-primary">
        <Gift className="size-4" />
        Recebe no mínimo <strong>{MIN_CLIENTE_PCT}%</strong> quando a sua indicação comprar ou vender.
      </div>

      {/* Os seus dados (quem indica) */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Os seus dados</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cr-from">O seu nome</Label>
            <Input id="cr-from" type="text" autoComplete="off" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Quem indica" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-fromcontact">O seu contacto</Label>
            <Input id="cr-fromcontact" type="text" autoComplete="off" value={form.fromContact} onChange={(e) => setForm({ ...form, fromContact: e.target.value })} placeholder="Email ou telemóvel (para acompanhar)" />
          </div>
        </div>
      </div>

      {/* A pessoa indicada */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">A pessoa que quer comprar ou vender</p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["comprar", "vender"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, purpose: p })}
              className={
                "rounded-lg border px-3 py-2 text-sm capitalize transition-colors " +
                (form.purpose === p ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary")
              }
            >
              Quer {p}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cr-name">Nome da pessoa indicada</Label>
            <Input id="cr-name" type="text" autoComplete="off" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nome do seu amigo/familiar" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-contact">Contacto da pessoa indicada</Label>
            <Input id="cr-contact" type="text" autoComplete="off" value={form.clientContact} onChange={(e) => setForm({ ...form, clientContact: e.target.value })} placeholder="Telefone ou email" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cr-mun">Zona / concelho de interesse</Label>
            <Input id="cr-mun" type="text" autoComplete="off" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} placeholder="Ex.: Albufeira" />
          </div>
        </div>

        {agency && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="size-4 text-primary" />
            Será encaminhada para a <span className="font-medium text-foreground">{agency.name}</span>.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cr-note">Nota (opcional)</Label>
        <textarea id="cr-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={box} placeholder="O que procura, orçamento, prazos…" />
      </div>

      <label htmlFor="cr-consent" className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <input id="cr-consent" type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          Confirmo que tenho autorização da pessoa indicada para partilhar o seu contacto, nos
          termos da{" "}
          <Link href="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
            Política de Privacidade
          </Link>
          . (RGPD)
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={sending}>
        {sending && <Loader2 className="size-4 animate-spin" />}
        Enviar indicação
      </Button>
    </form>
  );
}
