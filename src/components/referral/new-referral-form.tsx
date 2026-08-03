"use client";

import * as React from "react";
import { Check, Globe, Loader2, Percent, Send, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agents } from "@/lib/data/mock";
import { MIN_CONSULTOR_PCT } from "@/lib/data/referrals";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/** Formulário para o consultor SUBMETER uma nova referência (nacional ou
 *  internacional), podendo aumentar a % acima do mínimo. */
export function NewReferralForm({ meId }: { meId: string }) {
  const outros = agents.filter((a) => a.id !== meId);

  const [scope, setScope] = React.useState<"nacional" | "internacional">("nacional");
  const [toId, setToId] = React.useState(outros[0]?.id ?? "");
  const [toName, setToName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [sharePct, setSharePct] = React.useState(MIN_CONSULTOR_PCT);
  const [taxNote, setTaxNote] = React.useState("");
  const [note, setNote] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = React.useState<string | null>(null);

  const international = scope === "internacional";
  const pctBelowMin = sharePct < MIN_CONSULTOR_PCT;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!clientName.trim() || !clientContact.trim()) {
      setErr("Indique o nome e o contacto do cliente a referir.");
      return;
    }
    if (international && !toName.trim()) {
      setErr("Indique o nome do consultor internacional.");
      return;
    }
    if (!consent) {
      setErr("Confirme que tem consentimento do cliente para partilhar o contacto.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "consultor",
          fromId: meId,
          toId: international ? undefined : toId,
          toName: international ? toName.trim() : undefined,
          international,
          country: international ? country.trim() : undefined,
          taxNote: international ? taxNote.trim() : undefined,
          clientName: clientName.trim(),
          clientContact: clientContact.trim(),
          sharePct: Math.max(MIN_CONSULTOR_PCT, sharePct),
          note: note.trim() || undefined,
          consent,
        }),
      });
      const out = await res.json();
      if (res.ok && out.ok) {
        setState("ok");
        setClientName("");
        setClientContact("");
        setNote("");
        setTaxNote("");
        setConsent(false);
        setSharePct(MIN_CONSULTOR_PCT);
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("err");
        setErr(out.error ?? "Não foi possível enviar a referência.");
      }
    } catch {
      setState("err");
      setErr("Erro de ligação ao enviar a referência.");
    }
  }

  if (state === "ok") {
    return (
      <div className="rounded-2xl border bg-primary/5 p-6 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-5" />
        </div>
        <h3 className="mt-3 font-display text-lg">Referência enviada</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          O destino recebe a referência para aceitar, rejeitar ou contrapor a
          percentagem. Fica registada em <strong>Enviadas</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      {/* Âmbito */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: "nacional", label: "Consultor nacional", icon: Users },
          { v: "internacional", label: "Consultor internacional", icon: Globe },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setScope(o.v as typeof scope)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              scope === o.v ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
            )}
          >
            <o.icon className="size-4" /> {o.label}
          </button>
        ))}
      </div>

      {/* Destino */}
      <div className="mt-4">
        {international ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Consultor / agência de destino</Label>
              <Input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Nome do consultor internacional" />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ex.: Brasil, Espanha, Reino Unido" />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Consultor de destino</Label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={box}>
              {outros.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.agency}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cliente */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome do cliente a referir</Label>
          <Input type="text" autoComplete="off" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome" />
        </div>
        <div className="space-y-1.5">
          <Label>Contacto do cliente</Label>
          <Input type="text" autoComplete="off" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Telemóvel ou email" />
        </div>
      </div>

      {/* Percentagem */}
      <div className="mt-4">
        <Label className="flex items-center gap-1.5">
          <Percent className="size-3.5" /> Percentagem para quem refere
        </Label>
        <div className="mt-1.5 flex items-center gap-4">
          <input
            type="range"
            min={MIN_CONSULTOR_PCT}
            max={60}
            value={sharePct}
            onChange={(e) => setSharePct(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={MIN_CONSULTOR_PCT}
              max={100}
              value={sharePct}
              onChange={(e) => setSharePct(Number(e.target.value) || MIN_CONSULTOR_PCT)}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Mínimo garantido {MIN_CONSULTOR_PCT}%. Pode <strong>aumentar</strong> o
          valor da referência se quiser incentivar o destino.
        </p>
        {pctBelowMin && (
          <p className="mt-1 text-xs text-destructive">A percentagem não pode ser inferior a {MIN_CONSULTOR_PCT}%.</p>
        )}
      </div>

      {/* Aviso fiscal internacional */}
      {international && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3.5">
          <p className="text-sm font-medium text-foreground">Regras fiscais internacionais</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Numa referência transfronteiriça podem aplicar-se retenção na fonte,
            IVA / autoliquidação (reverse charge) e convenções de dupla tributação.
            Indique já o enquadramento acordado para ficar registado à partida.
          </p>
          <textarea
            rows={2}
            value={taxNote}
            onChange={(e) => setTaxNote(e.target.value)}
            className={cn(box, "mt-2")}
            placeholder="Ex.: retenção 25% no país de origem; fatura com reverse charge; NIF/VAT do parceiro…"
          />
        </div>
      )}

      {/* Nota */}
      <div className="mt-4 space-y-1.5">
        <Label>Nota (opcional)</Label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={box} placeholder="Contexto: o que procura, orçamento, zona…" />
      </div>

      {/* Consentimento */}
      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
        <span className="text-muted-foreground">
          Confirmo que tenho consentimento do cliente para partilhar o seu
          contacto com o consultor de destino (RGPD).
        </span>
      </label>

      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      <Button type="submit" className="mt-5 w-full" disabled={state === "sending" || pctBelowMin}>
        {state === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> A enviar…
          </>
        ) : (
          <>
            <Send className="size-4" /> Enviar referência
          </>
        )}
      </Button>
    </form>
  );
}
