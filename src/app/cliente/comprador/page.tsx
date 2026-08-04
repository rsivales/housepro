import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Calculator, FileText } from "lucide-react";

import { PortalShell } from "@/components/portal/portal-shell";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyRef } from "@/components/property/property-ref";
import { DealStepper } from "@/components/process/deal-stepper";
import { ReportQuality } from "@/components/portal/report-quality";
import { compradorPortal } from "@/lib/data/client";
import { propertyById } from "@/lib/data/mock";
import { dealById } from "@/lib/data/deal";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "Portal do comprador" };

const PROPOSAL_LABEL: Record<string, string> = {
  enviada: "Enviada",
  aceite: "Aceite",
  recusada: "Recusada",
};

export default function CompradorPortal() {
  const p = compradorPortal;
  const deal = dealById(p.dealId);
  const saved = p.saved.map((id) => propertyById(id)).filter(Boolean);

  return (
    <PortalShell active="comprador" clientName={p.name} consultantId={p.consultantId}>
      <h1 className="font-display text-2xl sm:text-3xl">A sua compra</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe o processo, as propostas e os imóveis que guardou — tudo num só sítio.
      </p>

      {/* Processo ativo */}
      {deal && (
        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary">Negócio em curso · {deal.reference}</p>
              <h2 className="mt-1 font-display text-xl">{deal.propertyTitle}</h2>
              <p className="text-sm text-muted-foreground">{deal.location}</p>
            </div>
            <p className="font-display text-2xl">{formatEuro(deal.amount)}</p>
          </div>
          <div className="mt-6">
            <DealStepper stage={deal.stage} creditStage={deal.creditStage} />
          </div>
        </section>
      )}

      {/* Propostas */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <FileText className="size-5 text-primary" /> Propostas
        </h2>
        <div className="mt-4 space-y-3">
          {p.proposals.map((pr) => {
            const prop = propertyById(pr.propertyId);
            return (
              <div key={pr.propertyId} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <PropertyRef propertyId={pr.propertyId} label={prop?.title ?? "Imóvel"} />
                  </p>
                  <p className="text-sm text-muted-foreground">Proposta: {formatEuro(pr.amount)}</p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
                    (pr.status === "aceite"
                      ? "bg-primary/15 text-primary"
                      : pr.status === "recusada"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-gold/15 text-gold-foreground")
                  }
                >
                  {PROPOSAL_LABEL[pr.status]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Orçamento + crédito */}
      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-secondary/40 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Orçamento definido</p>
          <p className="font-display text-2xl">{formatEuro(p.budget)}</p>
        </div>
        <Link
          href="/credito"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <Calculator className="size-4" /> Simular crédito
        </Link>
      </section>

      {/* Guardados */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Bookmark className="size-5 text-primary" /> Imóveis guardados
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {saved.map((prop) => prop && <PropertyCard key={prop.id} property={prop} />)}
        </div>
      </section>

      {/* Voz do cliente → Qualidade */}
      <section className="mt-10">
        <ReportQuality consultantId={p.consultantId} clientName={p.name} />
      </section>
    </PortalShell>
  );
}
