"use client";

import * as React from "react";
import { Loader2, Phone, X } from "lucide-react";

import { recordEngagement } from "@/lib/portfolio/engagement";
import { track } from "@/lib/analytics";
import { normalizeContactPhone } from "@/lib/phone";

const CONTACT_KEY = "housepro:call-contact";

type StoredContact = { name?: string; phone?: string };

export function CallCaptureButton({
  telHref,
  agentName,
  propertyId,
  refId,
  className,
  children,
  ariaLabel,
}: {
  telHref: string;
  agentName: string;
  propertyId?: string;
  refId?: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const sessionKey = `housepro:call-registered:${propertyId ?? refId ?? agentName}`;

  React.useEffect(() => {
    if (!open) return;
    try {
      const stored = JSON.parse(localStorage.getItem(CONTACT_KEY) || "{}") as StoredContact;
      setName(stored.name ?? "");
      setPhone(stored.phone ?? "");
    } catch {
      // O formulário continua vazio se o armazenamento estiver indisponível.
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, submitting]);

  function start() {
    track("pdp_call_click");
    if (propertyId) recordEngagement(propertyId, "contact");
    try {
      if (sessionStorage.getItem(sessionKey) === "1") {
        window.location.assign(telHref);
        return;
      }
    } catch {
      // Em modo privado, apresenta o formulário normalmente.
    }
    setError("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeContactPhone(phone);
    if (!normalized) {
      setError("Indique um número de telefone válido.");
      return;
    }
    if (!consent) {
      setError("É necessário autorizar o tratamento do contacto para continuar.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/contact-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ref: refId,
          channel: "Chamada identificada",
          clientName: name.trim(),
          clientPhone: normalized,
          consent: true,
          pageUrl: window.location.href,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: name.trim(), phone: normalized }));
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // O registo no Helix já foi concluído; storage é apenas conveniência.
      }
      setOpen(false);
      window.location.assign(telHref);
    } catch {
      setError("Não foi possível registar o contacto. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={start} className={className} aria-label={ariaLabel}>
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-[#0B1F3A]/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="call-capture-title" className="w-full rounded-t-3xl bg-white p-5 text-left shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--hp-red)]">Contacto telefónico</p>
                <h2 id="call-capture-title" className="mt-1 text-xl font-semibold text-[var(--hp-navy)]">Antes de ligar a {agentName}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--hp-navy)] hover:bg-black/5"><X className="size-5" /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Indique o seu número para podermos ligar de volta caso a chamada não seja atendida ou seja interrompida.</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-[var(--hp-navy)]">Nome <span className="font-normal text-slate-500">(opcional)</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1.5 min-h-12 w-full rounded-xl border px-3 outline-none focus:border-[var(--hp-navy)] focus:ring-2 focus:ring-[var(--hp-navy)]/15" />
              </label>
              <label className="block text-sm font-medium text-[var(--hp-navy)]">Número de telefone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex.: 912 345 678" className="mt-1.5 min-h-12 w-full rounded-xl border px-3 outline-none focus:border-[var(--hp-navy)] focus:ring-2 focus:ring-[var(--hp-navy)]/15" />
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[var(--hp-red)]" />
                <span>Autorizo a HousePro a tratar este número para realizar e acompanhar este contacto. Não inclui comunicações de marketing.</span>
              </label>
              {error && <p role="alert" className="text-sm font-medium text-[var(--hp-red)]">{error}</p>}
              <button disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--hp-red)] px-5 text-sm font-semibold text-white disabled:opacity-60">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
                {submitting ? "A guardar…" : "Guardar e ligar agora"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
