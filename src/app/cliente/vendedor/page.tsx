import type { Metadata } from "next";
import { Eye, Users, CalendarCheck, Check, AlertTriangle } from "lucide-react";

import { PortalShell } from "@/components/portal/portal-shell";
import { DealStepper } from "@/components/process/deal-stepper";
import { vendedorPortal } from "@/lib/data/client";
import { propertyById } from "@/lib/data/mock";
import { dealById } from "@/lib/data/deal";
import { docStatus, docLabel, requiredDocKinds } from "@/lib/imovel/model";
import { formatEuro, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Portal do vendedor" };

export default function VendedorPortal() {
  const p = vendedorPortal;
  const property = propertyById(p.propertyId);
  const deal = dealById(p.dealId);
  const isCompany = property?.sellerType === "empresa";
  const st = docStatus(property?.documents ?? [], isCompany);
  const requiredKinds = requiredDocKinds(isCompany);

  const stats = [
    { icon: Eye, label: "Visualizações", value: p.stats.views.toLocaleString("pt-PT") },
    { icon: Users, label: "Contactos", value: String(p.stats.leads) },
    { icon: CalendarCheck, label: "Visitas", value: String(p.stats.visits) },
  ];

  return (
    <PortalShell active="vendedor" clientName={p.name} consultantId={p.consultantId}>
      <h1 className="font-display text-2xl sm:text-3xl">A sua venda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Desempenho da montra, avaliação e evolução do processo de venda.
      </p>

      {/* Imóvel + avaliação */}
      {property && (
        <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="grid sm:grid-cols-[16rem_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={property.image} alt="" className="h-44 w-full object-cover sm:h-full" />
            <div className="p-5">
              <p className="text-xs font-medium text-primary">O seu imóvel · {property.reference}</p>
              <h2 className="mt-1 font-display text-xl">{property.title}</h2>
              <p className="text-sm text-muted-foreground">{property.parish}, {property.municipality}</p>
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Em comercialização</p>
                  <p className="font-display text-2xl">{formatPrice(property)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avaliação HousePro</p>
                  <p className="font-medium">
                    {formatEuro(p.valuation.min)} – {formatEuro(p.valuation.max)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Desempenho da montra */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <s.icon className="size-5" />
            </div>
            <p className="mt-3 font-display text-2xl">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Documentação */}
      <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Documentação</h2>
          {st.complete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
              <Check className="size-3.5" /> Completa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold-foreground">
              <AlertTriangle className="size-3.5" /> {st.missingCount} em falta
            </span>
          )}
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {requiredKinds.map((k) => {
            const has = (property?.documents ?? []).includes(k);
            return (
              <li key={k} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    "grid size-5 place-items-center rounded-full " +
                    (has ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground")
                  }
                >
                  {has ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className={has ? "" : "text-muted-foreground"}>{docLabel(k)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Processo de venda */}
      {deal && (
        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl">Processo de venda</h2>
          <div className="mt-6">
            <DealStepper stage={deal.stage} creditStage={deal.creditStage} />
          </div>
        </section>
      )}
    </PortalShell>
  );
}
