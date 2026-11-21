"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Loader2, Lock, AlertCircle, RefreshCw, Mail, ShoppingCart, Gift, Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { validateStep, TAXAS_MARGINAIS, parseCampaign,runSimulation,buildEmailReport,renderMvReportEmail, type MvSubmission } from "@/lib/tools/mais-valias-funnel";
import { calcularImtNoAno, suportaImtHistorico, IMT_FONTES, type Finalidade, type Localizacao } from "@/lib/tools/imt";

const KEY = "hp:mais-valias";
const BASE_STEPS = ["Imóvel", "Despesas", "Situação fiscal", "Contacto"] as const;
const YEARS = Array.from({ length: 41 }, (_, i) => String(new Date().getFullYear() + 1 - i));
const bs: React.CSSProperties = { borderColor: "var(--border)" };
const inputCls = "mt-1.5 h-11 w-full rounded-xl border bg-[var(--card)] px-3 text-sm outline-none focus-visible:ring-[3px]";
const eur = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n);
const amount = (v?:string) => Number((v??"").replace(/[^\d,.-]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",",".")) || 0;

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

export function MvForm({mode="public",consultantRef,consultant,readOnly=false}:{mode?:"public"|"professional";consultantRef?:string;consultant?:{name?:string;email?:string;photo?:string;publicTitle?:string};readOnly?:boolean}={}) {
  const professional=mode==="professional";
  const storageKey=professional?`${KEY}:professional:${consultantRef??"demo"}`:KEY;
  const STEPS=professional?["Imóvel","Despesas","Situação fiscal","Resultado"]:BASE_STEPS;
  const [preview,setPreview]=React.useState<ReturnType<typeof runSimulation>|null>(null);
  const [copyMessage,setCopyMessage]=React.useState("");
  const [showEmailPreview,setShowEmailPreview]=React.useState(false);
  const trackMv=(event:Parameters<typeof track>[0])=>{if(!professional)track(event);};
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<MvSubmission>({ aquisicao: "compra", quota: "100", residencia: "residente" });
  const [showImt,setShowImt]=React.useState(false);
  const [imtFin,setImtFin]=React.useState<Finalidade>("hpp");
  const [imtLoc,setImtLoc]=React.useState<Localizacao>("continente");
  const [imtVpt,setImtVpt]=React.useState("");
  const [imtJovem,setImtJovem]=React.useState(false);
  const [imtDate,setImtDate]=React.useState("");
  const [imtError,setImtError]=React.useState("");
  const appliedImt=React.useRef(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error" | "retry" | "success" | "duplicate">("idle");
  const [started, setStarted] = React.useState(false);
  const [intakeUrl,setIntakeUrl]=React.useState("");
  const [intakeStatus,setIntakeStatus]=React.useState("");
  const [intakeReplies,setIntakeReplies]=React.useState<{id:string;client_name:string;completed_at:string;answers:Partial<MvSubmission>}[]>([]);

  React.useEffect(() => {
    try { const raw = sessionStorage.getItem(storageKey); if (raw) setD((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* ignore */ }
    setD((p) => ({ ...p, pageUrl: location.origin + location.pathname, referrerUrl: document.referrer || undefined, utm: parseCampaign(location.search), ref: professional?consultantRef:new URLSearchParams(location.search).get("ref") || undefined, language: document.documentElement.lang || "pt" }));
  }, [storageKey,professional,consultantRef]);

  function persist(next: MvSubmission) {
    setD(next);
    try { const { consent, marketingConsent, rendimentoColetavel, rendimentoConjuge, ...rest } = next; void consent; void marketingConsent; void rendimentoColetavel; void rendimentoConjuge; sessionStorage.setItem(storageKey, JSON.stringify(rest)); } catch { /* ignore */ }
  }
  function patch(p: Partial<MvSubmission>) {
    if (!started) { setStarted(true); trackMv("mv_sim_start"); }
    setErrors((prev) => { if (!Object.keys(prev).length) return prev; const n = { ...prev }; for (const k of Object.keys(p)) delete n[k]; return n; });
    const changedAcquisition = "valorAquisicao" in p || "anoAquisicao" in p || "aquisicao" in p;
    if (changedAcquisition && appliedImt.current) { p = { ...p, imt: "", selo: "" }; appliedImt.current = false; }
    if ("imt" in p || "selo" in p) appliedImt.current = false;
    persist({ ...d, ...p });
  }
  function next() {
    const e = validateStep(step, d);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 0) trackMv("mv_step1_complete");
    if (step === 1) trackMv("mv_step2_complete");
    if (step === 2) {
      if(professional){try{setPreview(runSimulation(d));}catch{setErrors({simulation:"Reveja os valores e os anos introduzidos."});return;}}
      trackMv("mv_step3_complete");
    }
    setStep((s) => Math.min(3, s + 1));
  }
  function back() { setErrors({}); setStep((s) => Math.max(0, s - 1)); }

  async function createIntake(send:boolean){
    setIntakeStatus("A preparar o pedido…");
    try{
      const res=await fetch("/api/mais-valias/recolha",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:d.email,name:d.name,send})});
      const j=await res.json();if(!res.ok)throw new Error(j.error||"Não foi possível preparar a ligação.");
      setIntakeUrl(j.url);setIntakeStatus(send?(j.sent?"Convite enviado por email.":"Convite não enviado; copie a ligação ou tente novamente."):"Ligação pronta. Partilhe-a apenas com o cliente.");
    }catch(e){setIntakeStatus(e instanceof Error?e.message:"Falha na ligação.");}
  }
  async function loadIntakes(){try{const r=await fetch("/api/mais-valias/recolha",{cache:"no-store"});if(!r.ok)throw new Error();const j=await r.json();setIntakeReplies((j.requests??[]).filter((x:{completed_at:string})=>x.completed_at));setIntakeStatus("Respostas disponíveis abaixo.");}catch{setIntakeStatus("Não foi possível consultar as respostas.");}}

  const [emailSent, setEmailSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if(step<3){next();return;}
    if(professional&&readOnly){setErrors({consent:"O envio requer a tua sessão real."});return;}
    const errs = validateStep(3, d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus("loading"); trackMv("mv_sim_submit");
    try {
      const res = await fetch(professional?"/api/mais-valias/profissional":"/api/mais-valias", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) });
      if (res.ok) {
        const j = await res.json();
        setEmailSent(j.emailStatus === "enviado");
        setStatus(j.duplicate ? "duplicate" : "success");
        trackMv(j.emailStatus === "enviado" ? "mv_email_sent" : "mv_email_failed");
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
      } else if (res.status === 503) { setStatus("retry"); }
      else if (res.status === 422) { const j = await res.json(); setErrors(j.fields ?? {}); setStatus("idle"); setStep(0); }
      else { setStatus("error"); }
    } catch { setStatus(navigator.onLine ? "error" : "retry"); }
  }

  if (status === "success" || status === "duplicate") {
    return <SuccessState emailSent={emailSent} email={d.email} onEditEmail={() => { setStatus("idle"); setStep(3); }} onResend={() => submit(new Event("submit") as unknown as React.FormEvent)} />;
  }

  const ACQ: { key: NonNullable<MvSubmission["aquisicao"]>; label: string; icon: React.ElementType }[] = [
    { key: "compra", label: "Compra", icon: ShoppingCart },
    { key: "heranca", label: "Herança", icon: Gift },
    { key: "doacao", label: "Doação", icon: Heart },
  ];

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-[var(--card)] p-5 shadow-[0_18px_48px_rgba(11,31,58,.18)] sm:p-7" style={bs} noValidate>
      <h2 className="font-display text-xl text-[var(--hp-navy)] sm:text-2xl">Simulador de mais-valias</h2>
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

      {professional&&step===3&&preview&&<section className="mt-6 space-y-4 rounded-xl border bg-secondary/30 p-5"><img src="/brand/housepro-designer-red.png" width="170" alt="HousePro"/><h3 className="text-lg font-semibold">Resultado da simulação</h3><div className="grid gap-3 sm:grid-cols-2">{[["Mais-valia estimada",preview.maisValiaBruta],["Aquisição corrigida",preview.aquisicaoCorrigida],["Despesas consideradas",preview.despesasElegiveis],["Base potencialmente tributável",preview.baseTributavel]].map(([label,value])=><div className="rounded-xl border bg-card p-3" key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(value))}</p></div>)}</div><p className="text-sm"><strong>Variação indicativa do IRS:</strong> {preview.impostoEstimado===null?"Por apurar — confirme os dados fiscais e o enquadramento.":new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(preview.impostoEstimado)}</p><p className="text-sm">Reinvestimento considerado: {new Intl.NumberFormat('pt-PT',{style:'percent',maximumFractionDigits:1}).format(preview.reinvestimentoFracao)}.</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{preview.notes.map((note,i)=><li key={i}>{note}</li>)}</ul><p className="text-xs text-muted-foreground">Motor {preview.engineVersion} · ano fiscal {preview.fiscalYear}.</p><p className="text-sm font-bold">Estimativa indicativa. Não constitui liquidação de IRS nem substitui aconselhamento fiscal.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setShowEmailPreview(v=>!v)} className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold">{showEmailPreview?"Fechar":"Ver"} pré-visualização do email</button><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(buildEmailReport(d,preview).text);setCopyMessage("Resumo copiado.");}catch{setCopyMessage("Não foi possível copiar o resumo.");}}} className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold">Copiar relatório completo</button></div>{showEmailPreview&&<iframe title="Pré-visualização do relatório ao cliente" sandbox="" srcDoc={renderMvReportEmail(buildEmailReport(d,preview),consultant)} className="h-[620px] w-full rounded-lg border bg-white"/>}{copyMessage&&<p role="status" className="text-sm">{copyMessage}</p>}</section>}
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
            {d.aquisicao==="compra"&&<section className="rounded-xl border bg-secondary/30 p-4 sm:p-5" aria-label="Calcular impostos pagos na compra">
              <button type="button" aria-expanded={showImt} onClick={()=>setShowImt(v=>!v)} className="text-left font-semibold text-[var(--hp-navy)]">{showImt?"−":"+"} Não se lembra do IMT e do Selo? Calcular aqui</button>
              {showImt&&<div className="mt-4 space-y-4 text-sm">
                <p>Usamos o valor e o ano de compra indicados no passo anterior. Escolha a finalidade <strong>à data da compra</strong>.</p>
                <div className="grid gap-3 sm:grid-cols-2"><label>Finalidade à data da compra<select className={inputCls} value={imtFin} onChange={e=>setImtFin(e.target.value as Finalidade)}><option value="hpp">Habitação própria e permanente</option><option value="secundaria">Segunda habitação, arrendamento ou investimento</option><option value="terreno">Prédio urbano não habitacional / terreno</option><option value="rustico">Prédio rústico</option></select></label><label>Localização<select className={inputCls} value={imtLoc} onChange={e=>setImtLoc(e.target.value as Localizacao)}><option value="continente">Continente</option><option value="ra">Açores / Madeira</option></select></label></div>
                <div className="grid gap-3 sm:grid-cols-2"><Num id="mv-imt-vpt" label="VPT na data da compra, se souber" value={imtVpt} onChange={setImtVpt} hint="O imposto usa o maior entre preço da escritura e VPT."/><label>Data da compra (necessária para IMT Jovem de 2024)<input type="date" className={inputCls} value={imtDate} onChange={e=>setImtDate(e.target.value)}/></label></div>
                {imtFin==="hpp"&&Number(d.anoAquisicao)>=2024&&<label className="flex items-start gap-2"><input type="checkbox" checked={imtJovem} onChange={e=>setImtJovem(e.target.checked)}/>Beneficiei de IMT Jovem na primeira habitação, até 35 anos (confirmar condições na liquidação)</label>}
                {!suportaImtHistorico(Number(d.anoAquisicao))?<p className="rounded-lg border border-amber-300 bg-amber-50 p-3">Ainda não temos uma tabela histórica validada para {d.anoAquisicao||"este ano"}. Consulte a escritura ou a liquidação no Portal das Finanças e introduza os montantes abaixo. Não aplicamos a tabela atual a uma compra antiga.</p>:<button type="button" className="rounded-lg bg-[var(--hp-navy)] px-4 py-2.5 font-semibold text-white" onClick={()=>{try{if(imtDate&&Number(imtDate.slice(0,4))!==Number(d.anoAquisicao))throw new Error("A data deve corresponder ao ano de aquisição.");const r=calcularImtNoAno({fin:imtFin,loc:imtLoc,preco:amount(d.valorAquisicao),vpt:amount(imtVpt),jovem:imtFin==="hpp"&&imtJovem},Number(d.anoAquisicao),imtDate||undefined);if(!r.base)throw new Error("Indique o valor da compra no passo anterior.");patch({imt:r.imt.toFixed(2),selo:r.isAquisicao.toFixed(2)});appliedImt.current=true;setImtError(`Aplicados: IMT ${eur(r.imt)} e Selo da aquisição ${eur(r.isAquisicao)} (base ${eur(r.base)}).`);}catch(e){setImtError(e instanceof Error?e.message:"Não foi possível calcular.");}}}>Calcular e usar no relatório</button>}
                {imtError&&<p role="status">{imtError}</p>}
                {suportaImtHistorico(Number(d.anoAquisicao))&&<a href={IMT_FONTES[Number(d.anoAquisicao)]} target="_blank" rel="noopener noreferrer" className="underline">Ver tabela da Autoridade Tributária para {d.anoAquisicao}</a>}
                <p className="text-xs text-muted-foreground">Estimativa para compra simples, sem outras isenções ou regimes especiais. Use os valores efetivamente pagos se tiver as liquidações. O Selo do crédito não é somado a esta despesa.</p>
              </div>}
            </section>}
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
            {professional&&<section className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <button type="button" aria-expanded={!!d.advanced} onClick={()=>patch({advanced:!d.advanced})} className="w-full text-left font-semibold text-[var(--hp-navy)]">{d.advanced?"−":"+"} Avançado · apuramento fiscal e agregado</button>
              {d.advanced&&<div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Peça apenas os dados necessários. O rendimento coletável anual deve excluir esta venda. Pode ser comunicado pelo cliente por ligação privada, telefone ou presencialmente, com registo da autorização.</p>
                <div className="grid gap-4 sm:grid-cols-2"><Num id="mv-rend" label="Rendimento coletável anual sem esta venda" value={d.rendimentoColetavel} onChange={v=>patch({rendimentoColetavel:v})} error={errors.rendimentoColetavel}/><Num id="mv-dep" label="Número de dependentes" prefix="" value={d.dependentes} onChange={v=>patch({dependentes:v})} error={errors.dependentes}/></div>
                <div className="grid gap-4 sm:grid-cols-2"><Num id="mv-vpt" label="Valor considerado para IMT na venda, se superior ao preço" value={d.vptRealizacao} onChange={v=>patch({vptRealizacao:v})}/><div className="grid grid-cols-2 gap-2"><label className="text-sm">Data da aquisição<input type="date" value={d.dataAquisicao??""} onChange={e=>patch({dataAquisicao:e.target.value})} className={inputCls}/><Err msg={errors.dataAquisicao}/></label><label className="text-sm">Data prevista da venda<input type="date" value={d.dataVenda??""} onChange={e=>patch({dataVenda:e.target.value})} className={inputCls}/><Err msg={errors.dataVenda}/></label></div></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.tributacaoConjunta} onChange={e=>patch({tributacaoConjunta:e.target.checked})}/>Tributação conjunta (casado ou unido de facto)</label>
                {d.tributacaoConjunta&&<Num id="mv-conj" label="Rendimento coletável anual do cônjuge, sem esta venda" value={d.rendimentoConjuge} onChange={v=>patch({rendimentoConjuge:v})} error={errors.rendimentoConjuge}/>}
                {d.hpp&&d.reinvestimento&&<div className="space-y-2 rounded-lg bg-slate-50 p-4"><p className="font-semibold">Condições do reinvestimento</p>{([['domicilioFiscal12Meses','Domicílio fiscal na habitação nos 12 meses anteriores'],['reinvestimentoNoPrazo','Reinvestimento entre 24 meses antes e 36 meses após a venda'],['reinvestimentoFundosProprios','Reinvestimento elegível com capitais próprios e intenção declarada no IRS']] as const).map(([key,label])=><label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!d[key]} onChange={e=>patch({[key]:e.target.checked})}/>{label}</label>)}</div>}
                <div className="space-y-2"><p className="font-semibold">Situações para análise individual</p>{([['apoioPublicoRelevante','Apoio público relevante para aquisição ou obras'],['outroGanhoMesmoAno','Outras mais-valias ou menos-valias imobiliárias no mesmo ano'],['situacaoEspecial','Reforma/65+, não residente, herança complexa ou outro regime especial']] as const).map(([key,label])=><label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!d[key]} onChange={e=>patch({[key]:e.target.checked})}/>{label}</label>)}</div>
                <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="mv-origem" className="text-sm font-medium">Como foram recolhidos os dados?</label><select id="mv-origem" value={d.dataSource??""} onChange={e=>patch({dataSource:e.target.value as MvSubmission['dataSource']})} className={inputCls}><option value="">Ainda não recolhidos</option><option value="cliente_ligacao">Ligação preenchida pelo cliente</option><option value="email">Email do cliente</option><option value="telefone">Telefonema</option><option value="presencial">Consulta na agência</option></select></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.consentRecorded} onChange={e=>patch({consentRecorded:e.target.checked})}/>Cliente informado e autorização registada</label></div>
                <Err msg={errors.consentRecorded}/>
                <p className="text-xs text-muted-foreground">Os dependentes ajudam a contextualizar o caso, mas deduções, taxa adicional de solidariedade e outras regras não integram a estimativa da variação da coleta. Confirme os valores com contabilista.</p>
              </div>}
            </section>}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-lg">{professional?"Enviar relatório ao cliente (opcional)":"Para onde enviamos a sua simulação?"}</legend>
            <p className="text-sm text-muted-foreground">{professional?"O resultado já está disponível acima. Preencha estes dados apenas se quiser enviar o relatório ao cliente e registar o pedido na sua carteira.":"Enviaremos a estimativa para o e-mail indicado. Um consultor HousePro poderá contactá-lo para ajudar a interpretar a simulação e esclarecer o seu caso."}</p>
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
            {professional&&!readOnly&&<div className="rounded-xl border bg-slate-50 p-4"><p className="font-semibold">Pedir dados fiscais em falta ao cliente</p><p className="mt-1 text-sm text-muted-foreground">A ligação privada expira em 7 dias. Envie-a por email ou copie-a para combinar um telefonema ou consulta presencial.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>createIntake(false)} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Criar ligação privada</button><button type="button" onClick={()=>createIntake(true)} disabled={!d.email} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">Pedir por email</button><button type="button" onClick={loadIntakes} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Ver respostas recebidas</button></div>{intakeUrl&&<div className="mt-2 break-all text-xs"><a href={intakeUrl} className="underline">{intakeUrl}</a> <button type="button" onClick={()=>navigator.clipboard.writeText(intakeUrl)} className="font-bold underline">Copiar</button></div>}{intakeReplies.map(item=><button type="button" key={item.id} onClick={()=>{persist({...d,...item.answers,advanced:true,dataSource:"cliente_ligacao",consentRecorded:true});setStep(2);setPreview(null);}} className="mt-2 block w-full rounded-lg border bg-white p-2 text-left text-sm">Importar respostas de {item.client_name||"cliente"} · {new Date(item.completed_at).toLocaleDateString('pt-PT')}</button>)}{intakeStatus&&<p role="status" className="mt-2 text-xs">{intakeStatus}</p>}</div>}
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
                <span>{professional?"Confirmo que o cliente autorizou o tratamento dos dados necessários para esta simulação e o envio do relatório, nos termos da Política de Privacidade HousePro.":<>Autorizo o tratamento dos meus dados para enviar o relatório e responder ao pedido, nos termos da <Link href="/privacidade" className="font-medium underline">Política de Privacidade</Link>. (RGPD)</>}</span>
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

      <Err msg={errors.simulation}/>
      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {step > 0 && <button type="button" onClick={back} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold sm:w-auto" style={bs}><ArrowLeft className="size-4" /> Voltar</button>}
        {step < 3 ? (
          <button type="button" onClick={next} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white" style={{ background: "var(--hp-navy)" }}>Continuar <ArrowRight className="size-4" /></button>
        ) : (
          <button type="submit" disabled={status === "loading"||(professional&&readOnly)} className="hp-btn-red inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold disabled:opacity-70">
            {status === "loading" ? <><Loader2 className="size-4 animate-spin" /> A enviar…</> : <>{professional?"Enviar relatório e registar pedido":"Calcular e enviar por e-mail"} <Mail className="size-4" /></>}
          </button>
        )}
      </div>
    </form>
  );
}

function SuccessState({ emailSent, email, onEditEmail, onResend }: { emailSent: boolean; email?: string; onEditEmail: () => void; onResend: () => void }) {
  const [resent, setResent] = React.useState(false);
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-6 text-center shadow-sm sm:p-8" style={bs}>
      <div className="mx-auto grid size-14 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}><Mail className="size-7" /></div>
      <h2 className="mt-4 font-display text-2xl">{emailSent ? "Simulação enviada. Consulte o seu e-mail." : "Pedido registado. Um consultor irá acompanhar a sua simulação."}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{emailSent ? "Enviámos a estimativa para" : "O envio automático está pendente para"} <strong className="text-foreground">{email}</strong>. Um consultor HousePro poderá contactá-lo para ajudar a interpretar o resultado e esclarecer o seu caso.</p>
      <p className="mt-2 text-xs text-muted-foreground">{emailSent ? "Não recebeu? Verifique a pasta de spam." : "O relatório está guardado no seu pedido para resposta pela equipa HousePro."}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">Voltar à página inicial</Link>
        <Link href="/avaliacao-imovel#comecar" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold" style={bs}>Falar com um consultor</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <button onClick={onEditEmail} className="font-medium" style={{ color: "var(--hp-navy)" }}>Corrigir o e-mail</button>
        <button onClick={() => { setResent(true); onResend(); }} disabled={resent} className="text-muted-foreground hover:underline disabled:opacity-60">{resent ? "Pedido de reenvio registado" : "Reenviar relatório"}</button>
      </div>
    </div>
  );
}
