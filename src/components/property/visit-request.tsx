"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Check, Loader2, Lock, MessageSquare, ShieldCheck, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { LeadIntent } from "@/lib/data/leads";

const box =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-[var(--hp-blue)] focus-visible:ring-2 focus-visible:ring-[var(--hp-blue)]/30";

const PERIODS = [
  { key: "manha", label: "Manhã" },
  { key: "tarde", label: "Tarde" },
  { key: "fim-tarde", label: "Fim do dia" },
] as const;

const PREFS = [
  { key: "telefone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail" },
] as const;

/** Lê os parâmetros de campanha do URL atual (sem dados pessoais). */
function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach((k) => {
    const v = p.get(k);
    if (v) utm[k] = v;
  });
  return utm;
}

/**
 * Bloco de conversão da página de imóvel: "Pedir visita" / "Enviar mensagem".
 * Cada envio cria uma lead no Helix (via /api/leads), associada ao imóvel e ao
 * consultor responsável, com origem, suborigem, URL, referrer e UTMs.
 */
export function VisitRequest({
  propertyId,
  reference,
  referrerId,
}: {
  propertyId: string;
  reference: string;
  referrerId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [intent, setIntent] = React.useState<LeadIntent>("visita");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submittedRef = React.useRef(false);
  const [form, setForm] = React.useState({
    name: "",
    contact: "",
    email: "",
    preferredDay: "",
    period: "",
    contactPreference: "telefone",
    message: "",
    consent: false,
    marketing: false,
  });

  function show(next: LeadIntent) {
    setIntent(next);
    setDone(false);
    setError(null);
    submittedRef.current = false;
    setOpen(true);
    track(next === "visita" ? "pdp_visit_open" : "pdp_message_open");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (submittedRef.current || sending) return; // evita duplicados
    if (!form.name.trim() || !form.contact.trim()) {
      setError("Indique o nome e um contacto.");
      return;
    }
    if (!form.consent) {
      setError("É necessário o seu consentimento para o contacto (RGPD).");
      return;
    }
    setSending(true);
    try {
      const preferredAt =
        intent === "visita" && form.preferredDay
          ? `${form.preferredDay}${form.period ? ` (${PERIODS.find((p) => p.key === form.period)?.label})` : ""}`
          : undefined;
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
          preferredAt,
          contactPreference: form.contactPreference,
          message: form.message || undefined,
          consent: form.consent,
          marketingConsent: form.marketing,
          subSource: "Página de imóvel",
          pageUrl: window.location.href,
          referrerUrl: document.referrer || undefined,
          utm: readUtm(),
          language: document.documentElement.lang || "pt",
        }),
      });
      if (!res.ok) throw new Error("failed");
      submittedRef.current = true;
      setDone(true);
      track("pdp_lead_submit");
    } catch {
      setError("Não foi possível enviar agora. Toque para tentar novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="visita-heading" className="rounded-2xl border bg-white p-6 sm:p-7">
      <h2 id="visita-heading" className="font-display text-2xl text-[var(--hp-navy)]">
        Gostaria de conhecer este imóvel?
      </h2>
      <p className="mt-2 text-sm text-[var(--hp-text-2)]">
        Escolha como prefere ser contactado pelo consultor responsável.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => show("visita")}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--hp-red)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--hp-red-hover)]"
        >
          <CalendarClock className="size-4" /> Pedir visita
        </button>
        <button
          type="button"
          onClick={() => show("mensagem")}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--hp-navy)]/20 px-5 py-3 text-sm font-semibold text-[var(--hp-navy)] transition-colors hover:bg-black/[0.03]"
        >
          <MessageSquare className="size-4" /> Enviar mensagem
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--hp-text-2)]">
        <Lock className="size-3.5" /> Sem compromisso · Os seus dados estão protegidos
      </p>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={intent === "visita" ? "Pedir visita" : "Enviar mensagem"}
            className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="font-display text-lg text-[var(--hp-navy)]">
                {intent === "visita" ? "Pedir visita" : "Enviar mensagem"}
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-[var(--hp-text-2)] hover:bg-black/[0.05]">
                <X className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Check className="size-7" />
                </div>
                <p className="font-display text-lg text-[var(--hp-navy)]">Pedido enviado</p>
                <p className="text-sm text-[var(--hp-text-2)]">
                  O consultor responsável entrará em contacto consigo em breve
                  {intent === "visita" ? " para confirmar a visita." : "."}
                </p>
                <button type="button" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-[var(--hp-navy)] px-6 py-2.5 text-sm font-medium text-white">
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 overflow-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-2">
                  {(["visita", "mensagem"] as LeadIntent[]).map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setIntent(it)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        intent === it ? "border-[var(--hp-red)] bg-[var(--hp-red)]/5 text-[var(--hp-navy)]" : "text-[var(--hp-text-2)] hover:bg-black/[0.03]"
                      )}
                    >
                      {it === "visita" ? "Pedir visita" : "Deixar mensagem"}
                    </button>
                  ))}
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--hp-navy)]">Nome</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="O seu nome" className={cn(box, "mt-1")} autoComplete="name" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-[var(--hp-navy)]">Telefone</span>
                    <input type="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="9XX XXX XXX" className={cn(box, "mt-1")} autoComplete="tel" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[var(--hp-navy)]">E-mail (opcional)</span>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@email.pt" className={cn(box, "mt-1")} autoComplete="email" />
                  </label>
                </div>

                {intent === "visita" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--hp-navy)]">Dia preferido</span>
                      <input type="date" value={form.preferredDay} onChange={(e) => setForm({ ...form, preferredDay: e.target.value })} className={cn(box, "mt-1")} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--hp-navy)]">Período</span>
                      <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={cn(box, "mt-1")}>
                        <option value="">Indiferente</option>
                        {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-[var(--hp-navy)]">Como prefere ser contactado?</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {PREFS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setForm({ ...form, contactPreference: p.key })}
                        aria-pressed={form.contactPreference === p.key}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                          form.contactPreference === p.key ? "border-[var(--hp-red)] bg-[var(--hp-red)]/5 text-[var(--hp-navy)]" : "text-[var(--hp-text-2)] hover:bg-black/[0.03]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--hp-navy)]">Mensagem (opcional)</span>
                  <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={cn(box, "mt-1")} placeholder={intent === "visita" ? "Ex.: prefiro fins de semana de manhã." : "A sua mensagem sobre este imóvel…"} />
                  <span className="mt-1 block text-xs text-[var(--hp-text-2)]">Ref. {reference}</span>
                </label>

                <label htmlFor="vr-consent" className="flex items-start gap-2 text-xs leading-relaxed text-[var(--hp-text-2)]">
                  <input id="vr-consent" type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--hp-red)]" />
                  <span>
                    Autorizo o tratamento dos meus dados para ser contactado sobre este pedido, nos termos da{" "}
                    <Link href="/privacidade" className="font-medium text-[var(--hp-red)] underline-offset-2 hover:underline">Política de Privacidade</Link>. (RGPD)
                  </span>
                </label>
                <label htmlFor="vr-mkt" className="flex items-start gap-2 text-xs leading-relaxed text-[var(--hp-text-2)]">
                  <input id="vr-mkt" type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--hp-red)]" />
                  <span>Aceito receber sugestões de imóveis semelhantes e novidades HousePro (opcional).</span>
                </label>

                {error && <p className="text-sm text-[var(--hp-red)]">{error}</p>}

                <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--hp-red)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--hp-red-hover)] disabled:opacity-60">
                  {sending && <Loader2 className="size-4 animate-spin" />}
                  {intent === "visita" ? "Enviar pedido de visita" : "Enviar mensagem"}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--hp-text-2)]">
                  <ShieldCheck className="size-3.5" /> Ligação segura · Dados protegidos
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
