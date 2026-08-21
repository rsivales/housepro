"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Loader2, Lock, AlertCircle, RefreshCw, Mail, ShoppingCart, Gift, Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { validateStep, TAXAS_MARGINAIS, parseCampaign, type MvSubmission } from "@/lib/tools/mais-valias-funnel";

const KEY = "hp:mais-valias";
const STEPS = ["Imóvel", "Despesas", "Situação fiscal", "Contacto"] as const;
const YEARS = Array.from({ length: 41 }, (_, i) => String(new Date().getFullYear() + 1 - i));
const bs: React.CSSProperties = { borderColor: "var(--border)" };
const inputCls = "mt-1.5 h-11 w-full rounded-xl border bg-[var(--card)] px-3 text-sm outline-none focus-visible:ring-[3px]";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--hp-red)" }}><AlertCircle className="size-3.5" /> {msg}</p>;
}
function Num({ label, hint, value, onChange, prefix = "€", id, error }: { label: string; hint?: string; value?: string; onChange: (v: string) => void; prefix?: string; id: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border bg-[var(--card)] px-3" style={{ borderColor: error ? "var(--hp-red)" : "var(--border)" }}>
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <input id={id} inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-11 w-full bg-transparent text-sm outline-none" />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <Err msg={error} />
    </div>
  );
}

export function MvForm() {
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<MvSubmission>({ aquisicao: "compra", quota: "100", residencia: "residente" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error" | "retry" | "success" | "duplicate">("idle");
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    try { const raw = sessionStorage.getItem(KEY); if (raw) setD((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* ignore */ }
    setD((p) => ({ ...p, pageUrl: location.origin + location.pathname, referrerUrl: document.referrer || undefined, utm: parseCampaign(location.search), ref: new URLSearchParams(location.search).get("ref") || undefined, language: document.documentElement.lang || "pt" }));
  }, []);

  function persist(next: MvSubmission) {
    setD(next);
    try { const { consent, marketingConsent, ...rest } = next; void consent; void marketingConsent; sessionStorage.setItem(KEY, JSON.stringify(rest)); } catch { /* ignore */ }
  }
  function patch(p: Partial<MvSubmission>) {
    if (!started) { setStarted(true); track("mv_sim_start"); }
    setErrors((prev) => { if (!Object.keys(prev).length) return prev; const n = { ...prev }; for (const k of Object.keys(p)) delete n[k]; return n; });
    persist({ ...d, ...p });
  }
  function next() {
    const e = validateStep(step, d);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 0) track("mv_step1_complete");
    if (step === 1) track("mv_step2_complete");
    if (step === 2) track("mv_step3_complete");
    setStep((s) => Math.min(3, s + 1));
  }
  function back() { setErrors({}); setStep((s) => Math.max(0, s - 1)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const errs = validateStep(3, d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus("loading"); track("mv_sim_submit");
    try {
      const res = await fetch("/api/mais-valias", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) });
      if (res.ok) {
        const j = await res.json();
        setStatus(j.duplicate ? "duplicate" : "success");
        track(j.emailStatus === "enviado" ? "mv_email_sent" : "mv_email_failed");
        try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
      } else if (res.status === 503) { setStatus("retry"); }
      else if (res.status === 422) { const j = await res.json(); setErrors(j.fields ?? {}); setStatus("idle"); setStep(0); }
      else { setStatus("error"); }
    } catch { setStatus(navigator.onLine ? "error" : "retry"); }
  }

  if (status === "success" || status === "duplicate") {
    return <SuccessState email={d.email} onEditEmail={() => { setStatus("idle"); setStep(3); }} onResend={() => submit(new Event("submit") as unknown as React.FormEvent)} />;
  }

  const ACQ: { key: NonNullable<MvSubmission["aquisicao"]>; label: string; icon: React.ElementType }[] = [
    { key: "compra", label: "Compra", icon: ShoppingCart },
    { key: "heranca", label: "Herança", icon: Gift },
    { key: "doacao", label: "Doação", icon: Heart },
  ];

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-[var(--card)] p-5 shadow-sm sm:p-6" style={bs} noValidate>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progresso">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full text-xs font-bold" style={{ background: i <= step ? "var(--hp-navy)" : "var(--secondary)", color: i <= step ? "#fff" : "var(--muted-foreground)" }} aria-current={i === step ? "step" : undefined}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 sm:block" style={{ background: "var(--border)" }} aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-6">
        {step === 0 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Imóvel</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Num id="mv-va" label="Valor de aquisição" value={d.valorAquisicao} onChange={(v) => patch({ valorAquisicao: v })} error={errors.valorAquisicao} />
              <div>
                <label htmlFor="mv-aa" className="text-sm font-medium">Ano de aquisição</label>
                <select id="mv-aa" value={d.anoAquisicao ?? ""} onChange={(e) => patch({ anoAquisicao: e.target.value })} className={inputCls} style={{ borderColor: errors.anoAquisicao ? "var(--hp-red)" : "var(--border)" }}>
                  <option value="">Selecione</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <Err msg={errors.anoAquisicao} />
              </div>
              <Num id="mv-vv" label="Valor previsto de venda" value={d.valorVenda} onChange={(v) => patch({ valorVenda: v })} error={errors.valorVenda} />
              <div>
                <label htmlFor="mv-av" className="text-sm font-medium">Ano de venda</label>
                <select id="mv-av" value={d.anoVenda ?? ""} onChange={(e) => patch({ anoVenda: e.target.value })} className={inputCls} style={{ borderColor: errors.anoVenda ? "var(--hp-red)" : "var(--border)" }}>
                  <option value="">Selecione</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <Err msg={errors.anoVenda} />
              </div>
              <Num id="mv-q" label="Percentagem de propriedade" value={d.quota} onChange={(v) => patch({ quota: v })} prefix="%" hint="100% se o imóvel é só seu." />
            </div>
            <div>
              <p className="text-sm font-medium">Como adquiriu?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ACQ.map((a) => (
                  <button key={a.key} type="button" onClick={() => patch({ aquisicao: a.key })} className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-colors" style={{ borderColor: d.aquisicao === a.key ? "var(--hp-navy)" : "var(--border)", background: d.aquisicao === a.key ? "var(--secondary)" : "transparent" }}>
                    <a.icon className="size-4" /> {a.label}
                  </button>
                ))}
              </div>
              {(d.aquisicao === "heranca" || d.aquisicao === "doacao") && (
                <p className="mt-2 text-xs text-muted-foreground">Em herança/doação, o valor de aquisição é o valor considerado para Imposto do Selo (VPT) à data.</p>
              )}
              <Err msg={errors.aquisicao} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" /> Pode rever os dados antes de enviar.</p>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-lg">Despesas e encargos</legend>
            <p className="text-sm text-muted-foreground">Indique o que se aplica — deixe em branco o resto. A dedutibilidade de cada despesa depende de comprovativos e das regras aplicáveis.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Num id="mv-imt" label="IMT" value={d.imt} onChange={(v) => patch({ imt: v })} />
              <Num id="mv-selo" label="Imposto do Selo" value={d.selo} onChange={(v) => patch({ selo: v })} />
              <Num id="mv-esc" label="Escritura" value={d.escritura} onChange={(v) => patch({ escritura: v })} />
              <Num id="mv-reg" label="Registos" value={d.registos} onChange={(v) => patch({ registos: v })} />
              <Num id="mv-com" label="Comissão de mediação" value={d.comissao} onChange={(v) => patch({ comissao: v })} />
              <Num id="mv-ce" label="Certificado energético" value={d.certificado} onChange={(v) => patch({ certificado: v })} />
              <Num id="mv-obras" label="Obras elegíveis (12 anos)" value={d.obras} onChange={(v) => patch({ obras: v })} hint="Obras de valorização com fatura." />
              <Num id="mv-out" label="Outras despesas" value={d.outras} onChange={(v) => patch({ outras: v })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={!!d.temComprovativos} onChange={(e) => patch({ temComprovativos: e.target.checked })} /> Tenho comprovativos das despesas indicadas</label>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-lg">Situação fiscal</legend>
            <div>
              <p className="text-sm font-medium">Residência fiscal</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["residente", "nao_residente"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => patch({ residencia: r })} className="rounded-xl border p-3 text-sm transition-colors" style={{ borderColor: d.residencia === r ? "var(--hp-navy)" : "var(--border)", background: d.residencia === r ? "var(--secondary)" : "transparent" }}>
                    {r === "residente" ? "Residente em Portugal" : "Não residente"}
                  </button>
                ))}
              </div>
              {d.residencia === "nao_residente" && <p className="mt-2 text-xs text-muted-foreground">O regime de não residentes (incl. UE/EEE) exige análise personalizada — enviamos a mais-valia estimada e um consultor ajuda a interpretar.</p>}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={!!d.hpp} onChange={(e) => patch({ hpp: e.target.checked })} /> Era a minha habitação própria e permanente</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={!!d.reinvestimento} onChange={(e) => patch({ reinvestimento: e.target.checked })} /> Vou reinvestir noutra habitação própria e permanente</label>
            {d.reinvestimento && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Num id="mv-rein" label="Valor a reinvestir" value={d.valorReinvestido} onChange={(v) => patch({ valorReinvestido: v })} />
                <Num id="mv-div" label="Empréstimo em dívida (a abater)" value={d.divida} onChange={(v) => patch({ divida: v })} hint="Do imóvel que vai vender." />
              </div>
            )}
            <div>
              <label htmlFor="mv-tm" className="text-sm font-medium">Rendimento coletável estimado (opcional)</label>
              <select id="mv-tm" value={d.taxaMarginal ?? ""} onChange={(e) => patch({ taxaMarginal: e.target.value })} className={inputCls} style={bs}>
                <option value="">Não indicar</option>
                {TAXAS_MARGINAIS.filter((t) => t.rate > 0).map((t) => <option key={t.rate} value={t.rate}>{t.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Só usado para estimar o imposto. Sem esta informação, enviamos apenas a base tributável.</p>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-lg">Para onde enviamos a sua simulação?</legend>
            <p className="text-sm text-muted-foreground">Enviaremos a estimativa para o e-mail indicado. Um consultor HousePro poderá contactá-lo para ajudar a interpretar a simulação e esclarecer o seu caso.</p>
            <div>
              <label htmlFor="mv-nome" className="text-sm font-medium">Nome</label>
              <input id="mv-nome" value={d.name ?? ""} onChange={(e) => patch({ name: e.target.value })} autoComplete="name" className={inputCls} style={{ borderColor: errors.name ? "var(--hp-red)" : "var(--border)" }} />
              <Err msg={errors.name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mv-email" className="text-sm font-medium">E-mail</label>
                <input id="mv-email" type="email" value={d.email ?? ""} onChange={(e) => patch({ email: e.target.value })} autoComplete="email" className={inputCls} style={{ borderColor: errors.email ? "var(--hp-red)" : "var(--border)" }} />
                <Err msg={errors.email} />
              </div>
              <div>
                <label htmlFor="mv-tel" className="text-sm font-medium">Telefone (opcional)</label>
                <input id="mv-tel" type="tel" value={d.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} autoComplete="tel" className={inputCls} style={{ borderColor: errors.phone ? "var(--hp-red)" : "var(--border)" }} />
                <Err msg={errors.phone} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mv-pref" className="text-sm font-medium">Preferência de contacto</label>
                <select id="mv-pref" value={d.contactPreference ?? ""} onChange={(e) => patch({ contactPreference: (e.target.value || undefined) as MvSubmission["contactPreference"] })} className={inputCls} style={bs}>
                  <option value="">Sem preferência</option><option value="telefone">Telefone</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option>
                </select>
              </div>
              <div>
                <label htmlFor="mv-hora" className="text-sm font-medium">Melhor horário (opcional)</label>
                <input id="mv-hora" value={d.bestTime ?? ""} onChange={(e) => patch({ bestTime: e.target.value })} placeholder="Ex.: após as 18h" className={inputCls} style={bs} />
              </div>
            </div>
            <div className="space-y-2 rounded-xl border p-3" style={bs}>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" checked={!!d.consent} onChange={(e) => patch({ consent: e.target.checked })} className="mt-0.5 size-4 shrink-0" />
                <span>Autorizo o tratamento dos meus dados para enviar o relatório e responder ao pedido, nos termos da <Link href="/privacidade" className="font-medium underline">Política de Privacidade</Link>. (RGPD)</span>
              </label>
              <Err msg={errors.consent} />
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" checked={!!d.marketingConsent} onChange={(e) => patch({ marketingConsent: e.target.checked })} className="mt-0.5 size-4 shrink-0" />
                <span>Aceito receber novidades e conteúdos úteis da HousePro (opcional).</span>
              </label>
            </div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" onChange={(e) => patch({ ...(({ website: e.target.value } as unknown) as Partial<MvSubmission>) })} className="hidden" aria-hidden />
            {status === "error" && <p role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--hp-red) 12%, transparent)", color: "var(--hp-red)" }}>Não foi possível enviar. Tente novamente.</p>}
            {status === "retry" && <p role="alert" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}><RefreshCw className="size-4" /> Ligação instável — toque em enviar novamente.</p>}
          </fieldset>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? <button type="button" onClick={back} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold" style={bs}><ArrowLeft className="size-4" /> Voltar</button> : <span />}
        {step < 3 ? (
          <button type="button" onClick={next} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold text-white" style={{ background: "var(--hp-navy)" }}>Continuar <ArrowRight className="size-4" /></button>
        ) : (
          <button type="submit" disabled={status === "loading"} className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold disabled:opacity-70">
            {status === "loading" ? <><Loader2 className="size-4 animate-spin" /> A enviar…</> : <>Calcular e enviar por e-mail <Mail className="size-4" /></>}
          </button>
        )}
      </div>
    </form>
  );
}

function SuccessState({ email, onEditEmail, onResend }: { email?: string; onEditEmail: () => void; onResend: () => void }) {
  const [resent, setResent] = React.useState(false);
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-6 text-center shadow-sm sm:p-8" style={bs}>
      <div className="mx-auto grid size-14 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}><Mail className="size-7" /></div>
      <h2 className="mt-4 font-display text-2xl">Simulação enviada. Consulte o seu e-mail.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Enviámos a estimativa para <strong className="text-foreground">{email}</strong>. Um consultor HousePro poderá contactá-lo para ajudar a interpretar o resultado e esclarecer o seu caso.</p>
      <p className="mt-2 text-xs text-muted-foreground">Não recebeu? Verifique a pasta de spam.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">Voltar à página inicial</Link>
        <Link href="/avaliacao-imovel#comecar" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold" style={bs}>Falar com um consultor</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <button onClick={onEditEmail} className="font-medium" style={{ color: "var(--hp-navy)" }}>Corrigir o e-mail</button>
        <button onClick={() => { setResent(true); onResend(); }} disabled={resent} className="text-muted-foreground hover:underline disabled:opacity-60">{resent ? "Reenviado" : "Reenviar relatório"}</button>
      </div>
    </div>
  );
}
