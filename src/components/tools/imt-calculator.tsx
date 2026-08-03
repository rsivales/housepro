"use client";

import * as React from "react";
import { Check, Copy, Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  calcularImt,
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
  "var(--chart-1, #dcd7c7)",
  "var(--gold, #cfb264)",
  "var(--chart-3, #bd9a3d)",
  "var(--gold, #a3862c)",
  "var(--chart-4, #7d6a20)",
  "var(--muted-foreground, #565b5a)",
  "var(--primary, #3f4444)",
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
  const [loc, setLoc] = React.useState<Localizacao>("continente");
  const [fin, setFin] = React.useState<Finalidade>("hpp");
  const [preco, setPreco] = React.useState(0);
  const [vpt, setVpt] = React.useState(0);
  const [jovem, setJovem] = React.useState(false);
  const [credito, setCredito] = React.useState(false);
  const [emprestimo, setEmprestimo] = React.useState(0);
  const [prazo, setPrazo] = React.useState<Prazo>("longo");
  const [copied, setCopied] = React.useState(false);

  const input: ImtInput = { loc, fin, preco, vpt, jovem, credito, emprestimo, prazo };
  const d = calcularImt(input);
  const jovemDisponivel = fin === "hpp";

  React.useEffect(() => {
    if (!jovemDisponivel && jovem) setJovem(false);
  }, [jovemDisponivel, jovem]);

  function copiar() {
    const txt =
      "Estimativa de impostos na compra de imóvel (2026)\n" +
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
    if (fin === "hpp" && !jovem)
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
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
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
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-muted-foreground/40 hover:bg-secondary"
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
            jovem ? "border-gold bg-gold/10" : "hover:border-muted-foreground/40"
          )}
        >
          <input
            type="checkbox"
            checked={jovem}
            disabled={!jovemDisponivel}
            onChange={(e) => setJovem(e.target.checked)}
            className="mt-0.5 size-[18px] accent-primary"
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

        {/* Crédito */}
        <div
          data-on={credito}
          className={cn(
            "mt-3 flex items-center gap-4 rounded-xl border p-3.5 transition-colors",
            credito ? "border-gold bg-gold/10" : ""
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
              credito ? "bg-primary" : "bg-muted-foreground/35"
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
      <div className="lg:sticky lg:top-20 h-fit rounded-2xl border bg-card shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-dashed p-6 pb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total de impostos
            </div>
            <div
              className={cn(
                "mt-1 font-display text-5xl leading-none tabular-nums",
                d.total === 0 && d.base > 0 && "text-gold"
              )}
            >
              {eur.format(d.total)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {d.base > 0 ? d.regime : "IMT + Imposto de Selo"}
            </div>
          </div>
          <div className="grid size-[74px] shrink-0 -rotate-12 place-items-center rounded-full border-2 border-gold text-center text-gold">
            <div>
              <b className="block font-display text-[15px] leading-none">2026</b>
              <small className="mt-1 block text-[8.5px] uppercase tracking-widest">IMT · IS</small>
            </div>
          </div>
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
          <div className="flex items-baseline justify-between gap-4 py-4">
            <div className="font-semibold">Total a pagar</div>
            <div className="font-display text-2xl font-medium tabular-nums">{eur.format(d.total)}</div>
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
            <div className="flex h-5 overflow-hidden rounded-md border bg-secondary">
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
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar resumo"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Printer className="size-4" /> Imprimir / PDF
          </button>
        </div>

        <p className="border-t border-dashed p-6 pt-4 text-xs leading-relaxed text-muted-foreground">
          {nota}
        </p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40 hover:bg-secondary"
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
            "w-full rounded-xl border bg-background pl-10 pr-4 font-display font-semibold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
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
    <div className="flex items-baseline justify-between gap-4 border-b border-secondary py-3">
      <div className="text-sm">
        {k}
        {sub && <small className="block text-xs text-muted-foreground">{sub}</small>}
      </div>
      <div className={cn("font-display text-lg tabular-nums whitespace-nowrap", free && "text-gold")}>
        {v}
      </div>
    </div>
  );
}
