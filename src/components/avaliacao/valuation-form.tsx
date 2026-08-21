"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, ArrowRight, ArrowLeft, Check, Loader2, Lock, AlertCircle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import {
  PROPERTY_TYPES, PROPERTY_CONDITIONS, EVALUATION_REASONS, SELL_TIMEFRAMES,
  CONTACT_PREFERENCES, validateStep, parseCampaign, type ValuationSubmission, type ContactPreference,
} from "@/lib/valuation";

const STORAGE_KEY = "hp:avaliacao";
const STEPS = ["Imóvel", "Contexto", "Contacto"] as const;

const inputCls = "h-11 w-full rounded-xl border bg-[var(--card)] px-3 text-sm outline-none focus-visible:ring-[3px]";
const inputStyle: React.CSSProperties = { borderColor: "var(--border)" };

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--hp-red)" }}><AlertCircle className="size-3.5" /> {msg}</p>;
}

const empty: ValuationSubmission = {
  location: "", propertyType: "", propertyCondition: "",
  name: "", email: "", phone: "", consent: false,
};

export function ValuationForm() {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<ValuationSubmission>(empty);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error" | "retry" | "success" | "duplicate">("idle");
  const [started, setStarted] = React.useState(false);
  const firstInvalidRef = React.useRef<HTMLInputElement>(null);

  // Recupera progresso da sessão e captura UTMs/ref.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setData((d) => ({ ...d, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
    setData((d) => ({
      ...d,
      pageUrl: window.location.origin + window.location.pathname,
      referrerUrl: document.referrer || undefined,
      utm: parseCampaign(window.location.search),
      ref: new URLSearchParams(window.location.search).get("ref") || undefined,
      language: document.documentElement.lang || "pt",
    }));
  }, []);

  function persist(next: ValuationSubmission) {
    setData(next);
    try {
      // Não guardar consentimentos nem notas sensíveis desnecessariamente longas.
      const { consent, marketingConsent, ...rest } = next;
      void consent; void marketingConsent;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch { /* ignore */ }
  }
  function patch(p: Partial<ValuationSubmission>) {
    if (!started) { setStarted(true); track("valuation_form_start"); }
    // Validação imediata: limpa os erros dos campos que estão a ser corrigidos.
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const k of Object.keys(p)) delete next[k];
      if ("email" in p || "phone" in p) delete next.contact;
      if ("consent" in p) delete next.consent;
      return next;
    });
    persist({ ...data, ...p });
  }

  function next() {
    const e = validateStep(step, data);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (step === 0) track("valuation_step1_complete");
    if (step === 1) track("valuation_step2_complete");
    setStep((s) => Math.min(2, s + 1));
  }
  function back() { setErrors({}); setStep((s) => Math.max(0, s - 1)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const errs = validateStep(2, data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { firstInvalidRef.current?.focus(); return; }

    setStatus("loading");
    track("valuation_form_submit");
    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const j = await res.json();
        setStatus(j.duplicate ? "duplicate" : "success");
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      } else if (res.status === 503) {
        setStatus("retry");
        track("valuation_form_error", { reason: "persist" });
      } else if (res.status === 422) {
        const j = await res.json();
        setErrors(j.fields ?? {});
        setStatus("idle");
        setStep(0);
        track("valuation_form_error", { reason: "validation" });
      } else {
        setStatus("error");
        track("valuation_form_error", { reason: String(res.status) });
      }
    } catch {
      setStatus(navigator.onLine ? "error" : "retry");
      track("valuation_form_error", { reason: "network" });
    }
  }

  if (status === "success" || status === "duplicate") {
    return <SuccessState data={data} onReset={() => { setData(empty); setStep(0); setStatus("idle"); }} onEditContact={() => { setStatus("idle"); setStep(2); }} />;
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-[var(--card)] p-5 shadow-sm sm:p-6" style={{ borderColor: "var(--border)" }} noValidate>
      {/* Indicador de etapas */}
      <ol className="flex items-center gap-2" aria-label="Progresso">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <li className="flex items-center gap-2">
              <span
                className={cn("grid size-7 place-items-center rounded-full text-xs font-bold")}
                style={{
                  background: i <= step ? "var(--hp-navy)" : "var(--secondary)",
                  color: i <= step ? "#fff" : "var(--muted-foreground)",
                }}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>{label}</span>
            </li>
            {i < STEPS.length - 1 && <li className="h-px flex-1" style={{ background: "var(--border)" }} aria-hidden />}
          </React.Fragment>
        ))}
      </ol>

      <div className="mt-6">
        {step === 0 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl">Comecemos pelo imóvel</legend>
            <div>
              <label htmlFor="v-loc" className="text-sm font-medium">Localização do imóvel</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border px-3" style={inputStyle}>
                <MapPin className="size-4 shrink-0" style={{ color: "var(--hp-navy)" }} />
                <input id="v-loc" ref={firstInvalidRef} value={data.location} onChange={(e) => patch({ location: e.target.value })} placeholder="Rua, freguesia ou concelho" className="h-11 w-full bg-transparent text-sm outline-none" autoComplete="address-level2" />
              </div>
              <Err msg={errors.location} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-type" className="text-sm font-medium">Tipo de imóvel</label>
                <select id="v-type" value={data.propertyType} onChange={(e) => patch({ propertyType: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="">Selecione o tipo</option>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Err msg={errors.propertyType} />
              </div>
              <div>
                <label htmlFor="v-cond" className="text-sm font-medium">Estado do imóvel</label>
                <select id="v-cond" value={data.propertyCondition} onChange={(e) => patch({ propertyCondition: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="">Selecione o estado</option>
                  {PROPERTY_CONDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Err msg={errors.propertyCondition} />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" /> Demora cerca de 1 minuto · Os seus dados estão protegidos.</p>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl">Um pouco de contexto</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipologia (ex.: T2)" value={data.typology} onChange={(v) => patch({ typology: v })} />
              <Field label="Área aproximada (m²)" value={data.area} onChange={(v) => patch({ area: v })} type="number" />
              <Field label="Número de quartos" value={data.bedrooms} onChange={(v) => patch({ bedrooms: v })} type="number" />
              <Field label="Características relevantes" value={data.features} onChange={(v) => patch({ features: v })} placeholder="Garagem, terraço, vista…" />
              <div>
                <label htmlFor="v-reason" className="text-sm font-medium">Motivo da avaliação</label>
                <select id="v-reason" value={data.reason ?? ""} onChange={(e) => patch({ reason: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="">Selecione</option>
                  {EVALUATION_REASONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="v-time" className="text-sm font-medium">Prazo provável</label>
                <select id="v-time" value={data.timeframe ?? ""} onChange={(e) => patch({ timeframe: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="">Selecione</option>
                  {SELL_TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl">Como prefere receber a avaliação?</legend>
            <p className="text-sm text-muted-foreground">
              A avaliação é personalizada e entregue por um consultor — por isso precisamos de pelo menos um contacto válido.
            </p>
            <Field label="Nome" value={data.name} onChange={(v) => patch({ name: v })} required error={errors.name} autoComplete="name" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" value={data.email} onChange={(v) => patch({ email: v })} type="email" autoComplete="email" />
              <Field label="Telefone" value={data.phone} onChange={(v) => patch({ phone: v })} type="tel" autoComplete="tel" />
            </div>
            <Err msg={errors.contact} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-pref" className="text-sm font-medium">Preferência de contacto</label>
                <select id="v-pref" value={data.contactPreference ?? ""} onChange={(e) => patch({ contactPreference: (e.target.value || undefined) as ContactPreference | undefined })} className={inputCls} style={inputStyle}>
                  <option value="">Sem preferência</option>
                  {CONTACT_PREFERENCES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <Field label="Melhor horário (opcional)" value={data.bestTime} onChange={(v) => patch({ bestTime: v })} placeholder="Ex.: manhãs, após as 18h" />
            </div>
            <Field label="Observações (opcional)" value={data.notes} onChange={(v) => patch({ notes: v })} />

            <div className="space-y-2 rounded-xl border p-3" style={inputStyle}>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" required checked={data.consent} onChange={(e) => patch({ consent: e.target.checked })} className="mt-0.5 size-4 shrink-0" />
                <span>Autorizo o tratamento dos meus dados para resposta a este pedido de avaliação, nos termos da <Link href="/privacidade" className="font-medium underline">Política de Privacidade</Link>. (RGPD)</span>
              </label>
              <Err msg={errors.consent} />
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" checked={!!data.marketingConsent} onChange={(e) => patch({ marketingConsent: e.target.checked })} className="mt-0.5 size-4 shrink-0" />
                <span>Aceito receber novidades e conteúdos úteis da HousePro (opcional).</span>
              </label>
            </div>

            {/* Honeypot anti-bot (escondido) */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" onChange={(e) => patch({ ...(({ website: e.target.value } as unknown) as Partial<ValuationSubmission>) })} className="hidden" aria-hidden />

            {status === "error" && <p role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--hp-red) 12%, transparent)", color: "var(--hp-red)" }}>Não foi possível enviar. Tente novamente.</p>}
            {status === "retry" && <p role="alert" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}><RefreshCw className="size-4" /> Guardámos o seu pedido. Ligação instável — toque em enviar novamente.</p>}
          </fieldset>
        )}
      </div>

      {/* Navegação */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={back} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold" style={inputStyle}>
            <ArrowLeft className="size-4" /> Voltar
          </button>
        ) : <span />}

        {step < 2 ? (
          <button type="button" onClick={next} className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">
            Continuar <ArrowRight className="size-4" />
          </button>
        ) : (
          <button type="submit" disabled={status === "loading"} className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold disabled:opacity-70">
            {status === "loading" ? <><Loader2 className="size-4 animate-spin" /> A enviar…</> : status === "retry" ? <><RefreshCw className="size-4" /> Tentar novamente</> : <>Pedir avaliação gratuita <ArrowRight className="size-4" /></>}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required, error, autoComplete,
}: {
  label: string; value?: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; required?: boolean; error?: string; autoComplete?: string;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required} autoComplete={autoComplete}
        aria-invalid={!!error}
        className="mt-1.5 h-11 w-full rounded-xl border bg-[var(--card)] px-3 text-sm outline-none focus-visible:ring-[3px]"
        style={{ borderColor: error ? "var(--hp-red)" : "var(--border)" }}
      />
      <Err msg={error} />
    </div>
  );
}

function SuccessState({ data, onReset, onEditContact }: { data: ValuationSubmission; onReset: () => void; onEditContact: () => void }) {
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-6 text-center shadow-sm sm:p-8" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto grid size-14 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>
        <Check className="size-7" />
      </div>
      <h2 className="mt-4 font-display text-2xl">Pedido recebido.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Um consultor HousePro irá analisar os dados do seu imóvel e entrar em contacto através do meio indicado.
      </p>

      <dl className="mx-auto mt-5 max-w-sm space-y-1.5 rounded-xl border p-4 text-left text-sm" style={{ borderColor: "var(--border)" }}>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Imóvel</dt><dd className="font-medium">{data.propertyType || "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Localização</dt><dd className="font-medium">{data.location || "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Contacto</dt><dd className="font-medium">{data.email || data.phone || "—"}</dd></div>
      </dl>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">Voltar ao início</Link>
        <button onClick={onEditContact} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>Corrigir contacto</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href="/noticias" className="font-medium" style={{ color: "var(--hp-navy)" }}>Ler artigos úteis</Link>
        <button onClick={onReset} className="text-muted-foreground hover:underline">Fazer novo pedido</button>
      </div>
    </div>
  );
}
