import type { Metadata } from "next";
import { TrendingUp, Percent, Wallet, Building2 } from "lucide-react";

import { PortalShell } from "@/components/portal/portal-shell";
import { PropertyCard } from "@/components/property/property-card";
import { investidorPortal } from "@/lib/data/client";
import { propertyById } from "@/lib/data/mock";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "Portal do investidor" };

export default function InvestidorPortal() {
  const p = investidorPortal;
  const totalInvested = p.holdings.reduce((s, h) => s + h.invested, 0);
  const totalNow = p.holdings.reduce((s, h) => s + h.valuationNow, 0);
  const monthly = p.holdings.reduce((s, h) => s + h.monthlyRent, 0);
  const avgYield = p.holdings.length
    ? p.holdings.reduce((s, h) => s + h.grossYield, 0) / p.holdings.length
    : 0;
  const valorizacao = totalInvested ? ((totalNow - totalInvested) / totalInvested) * 100 : 0;

  const kpis = [
    { icon: Wallet, label: "Investido", value: formatEuro(totalInvested) },
    { icon: Building2, label: "Valor atual", value: formatEuro(totalNow), sub: `+${valorizacao.toFixed(1)}%` },
    { icon: TrendingUp, label: "Renda mensal", value: `${formatEuro(monthly)}/mês` },
    { icon: Percent, label: "Yield médio", value: `${avgYield.toFixed(1)}%` },
  ];
  const opportunidades = p.opportunities.map((id) => propertyById(id)).filter(Boolean);

  return (
    <PortalShell active="investidor" clientName={p.name} consultantId={p.consultantId}>
      <h1 className="font-display text-2xl sm:text-3xl">A sua carteira</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Rentabilidades, valorização e oportunidades — números como estimativas.
      </p>

      {/* KPIs */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <k.icon className="size-5" />
            </div>
            <p className="mt-3 font-display text-xl">
              {k.value}
              {k.sub && <span className="ml-1 text-sm font-medium text-primary">{k.sub}</span>}
            </p>
            <p className="text-sm text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </section>

      {/* Carteira */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Imóveis em carteira</h2>
        <div className="mt-4 space-y-3">
          {p.holdings.map((h) => {
            const prop = propertyById(h.propertyId);
            return (
              <div key={h.propertyId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="grid sm:grid-cols-[12rem_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={prop?.image} alt="" className="h-32 w-full object-cover sm:h-full" />
                  <div className="p-4">
                    <p className="font-medium">{prop?.title}</p>
                    <p className="text-sm text-muted-foreground">{prop?.parish}, {prop?.municipality}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Renda" value={`${formatEuro(h.monthlyRent)}/mês`} />
                      <Metric label="Yield bruto" value={`${h.grossYield}%`} />
                      <Metric label="ROE" value={`${h.roe}%`} />
                      <Metric label="Ocupação" value={`${h.occupancy}%`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Oportunidades */}
      <section className="mt-10">
        <h2 className="font-display text-xl">Oportunidades para si</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {opportunidades.map((prop) => prop && <PropertyCard key={prop.id} property={prop} />)}
        </div>
      </section>
    </PortalShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
