"use client";

import * as React from "react";
import { Check, Copy, Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import { site, fullAddress } from "@/lib/site";
import {
  calcularImtNoAno, IMT_ANOS_SUPORTADOS,
  type Finalidade,
  type ImtInput,
  type Localizacao,
  type Prazo,
} from "@/lib/tools/imt";

const eur = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const eur0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const pct = (r: number) => `${(r * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

const BAR_COLORS = [
  "#c7d9e7", "#82aac8", "#3478a5", "#244765", "#0b1f3a", "#d62832", "#a31621",
];

function parseNum(s: string): number {
  const cleaned = (s || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.max(0, n);
}

const FINALIDADES: { v: Finalidade; label: string }[] = [
  { v: "hpp", label: "Habitação própria e permanente" },
  { v: "secundaria", label: "2.ª habitação, arrendamento ou investimento" },
  { v: "terreno", label: "Terreno / prédio urbano não habitacional" },
  { v: "rustico", label: "Prédio rústico" },
];

/** Calculadora pública de IMT + Imposto de Selo (usa o motor puro em lib/tools). */
export function ImtCalculator() {
  const [ano,setAno]=React.useState(2026);
  const [dataCompra,setDataCompra]=React.useState("");
  const [loc, setLoc] = React.useState<Localizacao>("continente");
  const [fin, setFin] = React.useState<Finalidade>("hpp");
  const [preco, setPreco] = React.useState(0);
  const [vpt, setVpt] = React.useState(0);
  const [jovem, setJovem] = React.useState(false);
  const [credito, setCredito] = React.useState(false);
  const [emprestimo, setEmprestimo] = React.useState(0);
  const [prazo, setPrazo] = React.useState<Prazo>("longo");
  const [copied, setCopied] = React.useState(false);
  const [lead,setLead]=React.useState({name:"",email:"",phone:"",question:"",consent:false});
  const [leadStatus,setLeadStatus]=React.useState<"idle"|"sending"|"sent"|"error">("idle");

  const jovemDisponivel = fin === "hpp" && ano >= 2024;
  const jovemNaData = jovem && (ano > 2024 || (dataCompra >= "2024-08-01" && dataCompra <= "2024-12-31"));
  const input: ImtInput = { loc, fin, preco, vpt, jovem: jovemNaData, credito, emprestimo, prazo };
  const d = calcularImtNoAno(input, ano);

  React.useEffect(() => {
    if (!jovemDisponivel && jovem) setJovem(false);
  }, [jovemDisponivel, jovem]);

  function copiar() {
    const txt =
      `Estimativa de impostos na compra de imóvel (${ano})\n` +
      `Base tributável: ${eur.format(d.base)}\n` +
      `IMT: ${d.imt === 0 ? "Isento" : eur.format(d.imt)}\n` +
      `Imposto de Selo (aquisição): ${d.isAquisicao === 0 ? "Isento" : eur.format(d.isAquisicao)}\n` +
      (credito ? `Imposto de Selo (crédito): ${eur.format(d.isCredito)}\n` : "") +
      `TOTAL: ${eur.format(d.total)}\n— Calculado com a ferramenta HousePro`;
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const nota = (() => {
    if (fin === "hpp" && !jovem && jovemDisponivel)
      return "Dica: se o comprador tem até 35 anos e é a 1.ª habitação, ative o IMT Jovem — pode ficar isento.";
    if (jovem && fin !== "hpp")
      return "O IMT Jovem só se aplica a habitação própria e permanente.";
    if (fin === "terreno")
      return "Terrenos para construção e prédios urbanos sem fim habitacional são tributados à taxa única de 6,5%, sem isenções de habitação.";
    if (fin === "secundaria")
      return "Na 2.ª habitação e investimento paga-se IMT desde o 1.º euro (1%) e não há IMT Jovem nem isenção inicial.";
    return "O IMT e o Imposto de Selo devem ser liquidados antes da escritura. O notário exige o comprovativo.";
  })();

  const mostraBar =
    d.segmentos.length > 1 || (d.segmentos.length === 1 && !d.segmentos[0].unica);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      {/* Entradas */}
      <div className="rounded-2xl border border-[#e5eaf1] bg-white p-5 shadow-[0_26px_60px_-42px_rgba(11,31,58,.6)] sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-[#e5eaf1] pb-5"><span className="grid size-9 place-items-center rounded-lg bg-[#0b1f3a] text-sm font-bold text-white">01</span><div><h3 className="font-display text-lg text-[#0b1f3a]">Dados da compra</h3><p className="text-xs text-[#667085]">Preencha o essencial. Pode ajustar depois.</p></div></div>
        <label htmlFor="imt-ano" className="mb-5 block text-xs font-bold uppercase tracking-wide text-[#34445a]">Ano da compra<select id="imt-ano" className="mt-2 block h-12 w-full rounded-lg border border-[#dfe6ef] bg-white px-3 text-sm font-medium text-[#0b1f3a] focus-visible:border-[#3478a5] focus-visible:ring-2 focus-visible:ring-[#3478a5]/20" value={ano} onChange={e=>{setAno(Number(e.target.value));setJovem(false);setDataCompra("")}}>{[...IMT_ANOS_SUPORTADOS].reverse().map(a=><option value={a} key={a}>{a}</option>)}</select></label>
        <Segmented
          label="Localização do imóvel"
          options={[
            { v: "continente", label: "Continente" },
            { v: "ra", label: "Açores / Madeira" },
          ]}
          value={loc}
          onChange={(v) => setLoc(v as Localizacao)}
        />

        <div className="mt-5">
          <FieldLabel>Finalidade / tipo de imóvel</FieldLabel>
          <div className="grid gap-2">
            {FINALIDADES.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setFin(o.v)}
                aria-pressed={fin === o.v}
                className={cn(
                  "rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
                  fin === o.v
                    ? "border-[#0b1f3a] bg-[#0b1f3a] font-semibold text-white"
                    : "border-[#dfe6ef] bg-white text-[#34445a] hover:border-[#3478a5] hover:bg-[#f2f6fa]"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <MoneyField
          label="Valor de aquisição (escritura)"
          value={preco}
          onChange={setPreco}
        />
        {ano===2024&&<label className="mt-4 block text-sm">Data da compra (para confirmar IMT Jovem)<input type="date" min="2024-01-01" max="2024-12-31" value={dataCompra} onChange={e=>setDataCompra(e.target.value)} className="mt-2 block h-12 w-full rounded-lg border border-[#dfe6ef] bg-white px-3"/></label>}
        <MoneyField
          label="Valor Patrimonial Tributário (opcional)"
          value={vpt}
          onChange={setVpt}
          hint="O imposto incide sobre o maior entre o preço e o VPT. Deixe em branco se não souber."
        />

        {/* IMT Jovem */}
        <label
          data-on={jovem}
          className={cn(
            "mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
            !jovemDisponivel && "pointer-events-none opacity-45",
            jovem ? "border-[#d62832] bg-[#fff3f3]" : "border-[#dfe6ef] hover:border-[#3478a5]"
          )}
        >
          <input
            type="checkbox"
            checked={jovem}
            disabled={!jovemDisponivel}
            onChange={(e) => setJovem(e.target.checked)}
            className="mt-0.5 size-[18px] accent-[#d62832]"
          />
          <span className="text-sm">
            <b className="block font-semibold">
              IMT Jovem — comprador até 35 anos, 1.ª habitação
            </b>
            <small className="text-muted-foreground">
              Isenção total ou parcial de IMT e Imposto de Selo. Só se aplica a
              habitação própria e permanente.
            </small>
          </span>
        </label>
        {jovem&&ano===2024&&!jovemNaData&&<p role="status" className="mt-2 text-xs text-amber-700">A isenção jovem entrou em vigor em 1 de agosto de 2024. Indique uma data a partir desse dia para a aplicar.</p>}

        {/* Crédito */}
        <div
          data-on={credito}
          className={cn(
            "mt-3 flex items-center gap-4 rounded-xl border p-3.5 transition-colors",
            credito ? "border-[#3478a5] bg-[#f2f6fa]" : "border-[#dfe6ef]"
          )}
        >
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold">
              Imposto de Selo do crédito à habitação
            </b>
            <small className="text-xs text-muted-foreground">
              {credito ? "Ligado — incluído no total" : "Desligado — não conta para o total"}
            </small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={credito}
            onClick={() => setCredito((v) => !v)}
            className={cn(
              "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors",
              credito ? "bg-[#0b1f3a]" : "bg-[#aab5c4]"
            )}
          >
            <span
              className={cn(
                "absolute top-[3px] size-6 rounded-full bg-white shadow transition-transform",
                credito ? "translate-x-[25px]" : "translate-x-[3px]"
              )}
            />
          </button>
        </div>
        {credito && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MoneyField label="Montante do empréstimo" value={emprestimo} onChange={setEmprestimo} compact />
            <div>
              <FieldLabel>Prazo</FieldLabel>
              <Segmented
                options={[
                  { v: "longo", label: "5+ anos" },
                  { v: "curto", label: "< 5 anos" },
                ]}
                value={prazo}
                onChange={(v) => setPrazo(v as Prazo)}
                bare
              />
            </div>
          </div>
        )}
      </div>

      {/* Resultado (recibo) */}
      <div className="lg:sticky lg:top-20 h-fit overflow-hidden rounded-2xl border border-[#d8e2ed] bg-white shadow-[0_26px_60px_-42px_rgba(11,31,58,.6)]">
        <div className="bg-[#0b1f3a] px-6 py-4 text-xs font-bold uppercase tracking-[.16em] text-white/75">02 · Resultado da simulação</div>
        <div className="flex items-start justify-between gap-4 border-b border-[#e5eaf1] p-6 pb-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#667085]">
              Total de impostos
            </div>
            <div
              className={cn(
                "mt-2 font-display text-4xl leading-none tabular-nums text-[#0b1f3a] sm:text-5xl",
                d.total === 0 && d.base > 0 && "text-[#24815d]"
              )}
            >
              {eur.format(d.total)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {d.base > 0 ? d.regime : "IMT + Imposto de Selo"}
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-[#edf3f8] px-3 py-2 text-xs font-bold text-[#0b1f3a]">Tabela {ano}</span>
        </div>

        <div className="px-6 pt-2">
          <Row k="IMT" v={d.base > 0 ? (d.imt === 0 ? "Isento" : eur.format(d.imt)) : "€0,00"} free={d.imt === 0 && d.base > 0} />
          <Row
            k="Imposto de Selo — aquisição"
            sub="0,8% sobre a base tributável"
            v={d.base > 0 ? (d.isAquisicao === 0 ? "Isento" : eur.format(d.isAquisicao)) : "€0,00"}
            free={d.isAquisicao === 0 && d.base > 0}
          />
          {credito && (
            <Row
              k="Imposto de Selo — crédito"
              sub={prazo === "longo" ? "0,6% · prazo 5+ anos" : "0,5% · prazo < 5 anos"}
              v={emprestimo > 0 ? eur.format(d.isCredito) : "€0,00"}
            />
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-[#dfe6ef] py-5">
            <div className="font-semibold">Total a pagar</div>
            <div className="font-display text-2xl font-bold tabular-nums text-[#d62832]">{eur.format(d.total)}</div>
          </div>
          {d.base > 0 && (
            <p className="pb-1 text-xs text-muted-foreground">
              Base tributável usada: <b className="font-medium text-foreground">{eur.format(d.base)}</b>
              {d.usouVpt && " (VPT, por ser superior ao preço)"}
            </p>
          )}
        </div>

        {mostraBar && (
          <div className="px-6 pb-6 pt-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Como se reparte o IMT pelos escalões
            </h4>
            <div className="flex h-3 overflow-hidden rounded-full bg-[#edf3f8]">
              {d.segmentos.map((s, i) => (
                <span
                  key={i}
                  style={{
                    flexBasis: `${((s.ate - s.de) / d.base) * 100}%`,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-0.5">
              {d.segmentos.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1 text-[13px] tabular-nums">
                  <span
                    className="size-[11px] shrink-0 rounded"
                    style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                  <span>
                    {eur0.format(s.de)} – {eur0.format(s.ate)}
                  </span>
                  <span className="text-muted-foreground">({pct(s.taxa)})</span>
                  <span className="ml-auto font-semibold">{eur.format(s.imp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 px-6 pb-5">
          <button
            type="button"
            onClick={copiar}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d62832] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#b71d26]"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar resumo"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={d.base === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dfe6ef] px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] hover:bg-[#f2f6fa] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Printer className="size-4" /> Imprimir / PDF
          </button>
        </div>

        <p className="border-t border-dashed p-6 pt-4 text-xs leading-relaxed text-muted-foreground">
          {nota}
        </p>
      </div>
      <section id="duvidas-imt" className="scroll-mt-20 rounded-2xl border border-[#dfe6ef] bg-white p-5 shadow-[0_26px_60px_-48px_rgba(11,31,58,.45)] sm:p-8 lg:col-span-2">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d62832]">Acompanhamento HousePro</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">Dúvidas sobre os impostos da sua compra?</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#596579]">Envie a sua questão. Um consultor recebe também o contexto da simulação para poder responder com mais precisão.</p></div>
        {leadStatus==="sent"?<p role="status" className="mt-5 rounded-lg bg-green-50 p-4">Pedido recebido. Um consultor entrará em contacto consigo.</p>:<form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={async e=>{e.preventDefault();setLeadStatus("sending");try{const ref=new URLSearchParams(location.search).get("ref")||undefined;const r=await fetch("/api/contact-intent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({channel:"Dúvidas IMT e Imposto do Selo",ref,clientName:lead.name,clientEmail:lead.email,clientPhone:lead.phone,consent:lead.consent,objetivo:`Ano ${ano}; ${fin}; ${loc}; preço ${eur.format(preco)}; VPT ${eur.format(vpt)}; base ${eur.format(d.base)}; IMT ${eur.format(d.imt)}; Selo aquisição ${eur.format(d.isAquisicao)}; Selo crédito ${eur.format(d.isCredito)}. Questão: ${lead.question}`,pageUrl:location.href})});if(!r.ok)throw new Error();setLeadStatus("sent")}catch{setLeadStatus("error")}}}>
          <label className="text-sm">Nome<input required maxLength={120} value={lead.name} onChange={e=>setLead(v=>({...v,name:e.target.value}))} className="mt-1 block w-full rounded-lg border px-3 py-2.5"/></label>
          <label className="text-sm">Telefone<input type="tel" required value={lead.phone} onChange={e=>setLead(v=>({...v,phone:e.target.value}))} className="mt-1 block w-full rounded-lg border px-3 py-2.5"/></label>
          <label className="text-sm">E-mail<input type="email" required value={lead.email} onChange={e=>setLead(v=>({...v,email:e.target.value}))} className="mt-1 block w-full rounded-lg border px-3 py-2.5"/></label>
          <label className="text-sm sm:col-span-2">A sua dúvida<textarea value={lead.question} onChange={e=>setLead(v=>({...v,question:e.target.value}))} rows={3} maxLength={2000} className="mt-1 block w-full rounded-lg border px-3 py-2.5"/></label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" required checked={lead.consent} onChange={e=>setLead(v=>({...v,consent:e.target.checked}))}/><span>Autorizo o tratamento dos meus dados e o contacto para responder a este pedido, conforme a <a href="/privacidade" className="underline">política de privacidade</a>.</span></label>
          {leadStatus==="error"&&<p role="alert" className="text-sm text-red-700 sm:col-span-2">Não foi possível enviar. Verifique os dados e tente novamente.</p>}
          <button disabled={leadStatus==="sending"} className="min-h-12 rounded-lg bg-[#d62832] px-5 py-3 text-sm font-bold text-white hover:bg-[#b71d26] disabled:opacity-50 sm:col-span-2 sm:justify-self-start">{leadStatus==="sending"?"A enviar…":"Pedir esclarecimento"}</button>
        </form>}
      </section>
      <div id="imt-print-report" className="imt-print-report" aria-label="Relatório HousePro de IMT e Imposto do Selo">
        <div className="imt-print-stripe" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="imt-print-watermark" src="/brand/watermark-bird.png" alt="" />
        <div className="imt-print-content">
          <header className="imt-print-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/housepro-logo.png" alt="HousePro" />
            <span>ESTIMATIVA DE AQUISIÇÃO · {ano}</span>
          </header>
          <p className="imt-print-eyebrow">FERRAMENTAS HOUSEPRO / COMPRA DE CASA</p>
          <h1>IMT e Imposto do Selo</h1>
          <p className="imt-print-intro">Simulação individual dos impostos na aquisição de um imóvel. Valores indicativos calculados com a tabela de {ano}.</p>
          <p className="imt-print-date">Emitido em {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Lisbon" })}</p>
          <h2>Dados utilizados</h2>
          <dl className="imt-print-table">
            <div><dt>Finalidade</dt><dd>{FINALIDADES.find(o => o.v === fin)?.label}</dd></div>
            <div><dt>Localização</dt><dd>{loc === "continente" ? "Portugal continental" : "Açores ou Madeira"}</dd></div>
            <div><dt>Valor da escritura</dt><dd>{eur.format(preco)}</dd></div>
            {vpt > 0 && <div><dt>Valor patrimonial tributário</dt><dd>{eur.format(vpt)}</dd></div>}
            <div><dt>Base tributável considerada</dt><dd>{eur.format(d.base)}</dd></div>
            {jovem && <div><dt>IMT Jovem</dt><dd>{jovemNaData ? "Considerado na simulação" : "Não aplicado à data indicada"}</dd></div>}
          </dl>
          <h2>Resultado estimado</h2>
          <dl className="imt-print-table">
            <div><dt>IMT</dt><dd>{d.imt === 0 ? "Isento" : eur.format(d.imt)}</dd></div>
            <div><dt>Imposto do Selo · aquisição</dt><dd>{d.isAquisicao === 0 ? "Isento" : eur.format(d.isAquisicao)}</dd></div>
            {credito && <div><dt>Imposto do Selo · crédito ({prazo === "longo" ? "5+ anos" : "menos de 5 anos"})</dt><dd>{eur.format(d.isCredito)}</dd></div>}
            <div className="imt-print-total"><dt>Total estimado</dt><dd>{eur.format(d.total)}</dd></div>
          </dl>
          <section className="imt-print-note"><strong>IMPORTANTE · ESTIMATIVA INDICATIVA</strong><p>Esta simulação não substitui a liquidação da Autoridade Tributária. Confirme os requisitos das isenções, a situação concreta do imóvel e as tabelas do ano escolhido antes da escritura. Não inclui emolumentos, registos, escritura e outros encargos.</p></section>
          <footer className="imt-print-footer"><span>HousePro · Paixão pelo que fazemos</span><span>housepro.pt / Ferramentas</span></footer>
        </div>
        <aside className="imt-print-sidebar">
          <span className="imt-print-sidebar-title">CONTACTOS</span>
          <strong>HousePro</strong>
          <span>{fullAddress}</span>
          <span>{site.email.general}</span>
          <span>housepro.pt</span>
          <span>AMI {site.amiLicense}</span>
          <span>NIPC {site.nipc}</span>
          <span className="imt-print-sidebar-legal">{site.legalName}</span>
        </aside>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#34445a]">
      {children}
    </p>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
  bare,
}: {
  label?: string;
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  bare?: boolean;
}) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className={cn("flex flex-wrap gap-2", bare && "mt-0")}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={value === o.v}
            className={cn(
              "flex-1 rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
              value === o.v
                ? "border-[#0b1f3a] bg-[#0b1f3a] font-semibold text-white"
                : "border-[#dfe6ef] bg-white text-[#34445a] hover:border-[#3478a5] hover:bg-[#f2f6fa]"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  hint,
  compact,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  compact?: boolean;
}) {
  const [raw, setRaw] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const display = focused
    ? raw
    : value
      ? value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })
      : "";

  return (
    <div className={cn(!compact && "mt-5")}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg text-muted-foreground">
          €
        </span>
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={display}
          onFocus={() => {
            setFocused(true);
            setRaw(value ? String(value).replace(".", ",") : "");
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setRaw(e.target.value);
            onChange(parseNum(e.target.value));
          }}
          className={cn(
            "w-full rounded-xl border border-[#dfe6ef] bg-white pl-10 pr-4 font-display font-semibold tabular-nums text-[#0b1f3a] outline-none focus-visible:border-[#3478a5] focus-visible:ring-[3px] focus-visible:ring-[#3478a5]/20",
            compact ? "py-2.5 text-lg" : "py-3.5 text-2xl"
          )}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ k, sub, v, free }: { k: string; sub?: string; v: string; free?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#e5eaf1] py-3">
      <div className="text-sm">
        {k}
        {sub && <small className="block text-xs text-muted-foreground">{sub}</small>}
      </div>
      <div className={cn("font-display text-lg tabular-nums whitespace-nowrap text-[#0b1f3a]", free && "!text-[#24815d]")}>
        {v}
      </div>
    </div>
  );
}
