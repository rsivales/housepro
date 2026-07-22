"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const eur0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function Field({
  label,
  suffix,
  ...props
}: React.ComponentProps<"input"> & { label: string; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <div className="flex items-center rounded-md border border-input bg-transparent px-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <input
          {...props}
          type="number"
          className="h-9 w-full bg-transparent text-sm outline-none"
        />
        {suffix && <span className="ml-2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function CreditSimulator({ initialPrice = 300000 }: { initialPrice?: number }) {
  const [price, setPrice] = React.useState(initialPrice);
  const [downPct, setDownPct] = React.useState(20);
  const [years, setYears] = React.useState(30);
  const [rate, setRate] = React.useState(3.4);

  const financed = Math.max(0, price * (1 - downPct / 100));
  const n = years * 12;
  const i = rate / 100 / 12;
  const monthly =
    i === 0 ? financed / n : (financed * i) / (1 - Math.pow(1 + i, -n));
  const total = monthly * n;
  const interest = total - financed;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="price"
          label="Valor do imóvel"
          suffix="€"
          value={price}
          min={0}
          step={5000}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
        <Field
          id="down"
          label="Entrada"
          suffix="%"
          value={downPct}
          min={0}
          max={90}
          onChange={(e) => setDownPct(Number(e.target.value))}
        />
        <Field
          id="years"
          label="Prazo"
          suffix="anos"
          value={years}
          min={5}
          max={40}
          onChange={(e) => setYears(Number(e.target.value))}
        />
        <Field
          id="rate"
          label="Taxa anual (TAN)"
          suffix="%"
          value={rate}
          min={0}
          step={0.1}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <div>
          <p className="text-sm text-primary-foreground/80">Prestação mensal estimada</p>
          <p className="mt-1 font-display text-4xl">{eur0.format(monthly || 0)}</p>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-t border-white/20 pt-2">
            <dt className="text-primary-foreground/80">Montante financiado</dt>
            <dd className="font-medium">{eur0.format(financed)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-primary-foreground/80">Juros totais</dt>
            <dd className="font-medium">{eur0.format(interest || 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-primary-foreground/80">Total a pagar</dt>
            <dd className="font-medium">{eur0.format(total || 0)}</dd>
          </div>
        </dl>
        <Button variant="brand" size="lg" className="w-full" asChild>
          <Link href="/vender#contacto">
            Falar com um consultor <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground lg:col-span-2">
        Simulação indicativa, sem valor contratual. Não dispensa a análise de uma
        instituição de crédito. TAEG e condições variam consoante o perfil.
      </p>
    </div>
  );
}
