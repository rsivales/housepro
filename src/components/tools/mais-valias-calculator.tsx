"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  calcularMaisValias,
  TAXAS_MARGINAIS_IRS,
  type MaisValiasInput,
} from "@/lib/tools/mais-valias";

const eur0 = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pct = (r: number) => `${(r * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

function NumField({
  label, value, onChange, suffix, id,
}: { label: string; value: number; onChange: (n: number) => void; suffix?: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center rounded-md border border-input bg-transparent px-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <input
          id={id}
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-full bg-transparent text-sm outline-none"
        />
        {suffix && <span className="ml-2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function MaisValiasCalculator() {
  const [venda, setVenda] = React.useState(350000);
  const [aquisicao, setAquisicao] = React.useState(220000);
  const [coeficiente, setCoeficiente] = React.useState(1.0);
  const [despesas, setDespesas] = React.useState(15000);
  const [encargos, setEncargos] = React.useState(10000);
  const [reinvestimento, setReinvestimento] = React.useState(false);
  const [taxaMarginal, setTaxaMarginal] = React.useState(0.32);

  const input: MaisValiasInput = {
    venda, aquisicao, coeficiente, despesas, encargos,
    fracaoTributavel: 0.5, reinvestimento, taxaMarginal,
  };
  const r = calcularMaisValias(input);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Formulário */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField id="mv-venda" label="Valor de venda" value={venda} onChange={setVenda} suffix="€" />
          <NumField id="mv-aquisicao" label="Valor de compra" value={aquisicao} onChange={setAquisicao} suffix="€" />
          <NumField id="mv-desp" label="Despesas de compra e venda" value={despesas} onChange={setDespesas} suffix="€" />
          <NumField id="mv-enc" label="Obras (valorização, 12 anos)" value={encargos} onChange={setEncargos} suffix="€" />
          <div className="space-y-1.5">
            <Label htmlFor="mv-coef">Coeficiente de desvalorização</Label>
            <div className="flex items-center rounded-md border border-input bg-transparent px-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <input id="mv-coef" type="number" step="0.01" value={coeficiente} onChange={(e) => setCoeficiente(Number(e.target.value))} className="h-9 w-full bg-transparent text-sm outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mv-taxa">Taxa marginal de IRS</Label>
            <select id="mv-taxa" value={taxaMarginal} onChange={(e) => setTaxaMarginal(Number(e.target.value))} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
              {TAXAS_MARGINAIS_IRS.map((t) => <option key={t.rate} value={t.rate}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={reinvestimento} onChange={(e) => setReinvestimento(e.target.checked)} />
          <span>Habitação própria e permanente com <strong>reinvestimento</strong> (isenção)</span>
        </label>
      </div>

      {/* Resultado */}
      <div className="rounded-2xl border bg-secondary/40 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-muted-foreground">Imposto estimado sobre a mais-valia</p>
        <p className="mt-1 font-display text-3xl sm:text-4xl">{eur0.format(Math.round(r.imposto))}</p>
        <p className="mt-1 text-sm text-muted-foreground">Taxa efetiva: {pct(r.taxaEfetiva)}</p>

        <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Valor de compra corrigido</dt><dd className="font-medium">{eur0.format(Math.round(r.aquisicaoCorrigida))}</dd></div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{r.menosValia ? "Menos-valia" : "Mais-valia"}</dt>
            <dd className="font-medium">{eur0.format(Math.round(r.maisValia))}</dd>
          </div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Base tributável (50%)</dt><dd className="font-medium">{eur0.format(Math.round(r.baseTributavel))}</dd></div>
        </dl>

        {r.menosValia ? (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            Sem imposto: a operação resulta em menos-valia (pode ser reportada em IRS).
          </p>
        ) : reinvestimento ? (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            Com reinvestimento em HPP, a mais-valia pode ficar isenta (total ou parcialmente).
          </p>
        ) : null}

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Resultado indicativo e gratuito. Para residentes, só 50% da mais-valia é tributada, às
          taxas progressivas de IRS (englobamento). Confirme o coeficiente de desvalorização
          (Portaria) e o seu caso com um contabilista. Não substitui o apuramento nas Finanças.
        </p>
      </div>
    </div>
  );
}
