import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge, PhoneOff, TrendingDown, Tag, ImageOff } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listPropertiesByAgent, listLeadsByAgent } from "@/lib/db/repo";
import { propertyKpi, perfSummary } from "@/lib/data/property-perf";

export const metadata: Metadata = { title: "Desempenho dos imóveis" };

export default async function DesempenhoPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [properties, leads] = await Promise.all([
    listPropertiesByAgent(session.agent.id),
    listLeadsByAgent(session.agent.id),
  ]);

  // Contagem de leads por imóvel.
  const leadCount = new Map<string, number>();
  for (const l of leads) {
    if (l.propertyId) leadCount.set(l.propertyId, (leadCount.get(l.propertyId) ?? 0) + 1);
  }
  const items = properties.map((property) => ({ property, leadCount: leadCount.get(property.id) ?? 0 }));
  const summary = perfSummary(items);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Gauge className="size-7 text-primary" /> Desempenho dos imóveis
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Onde agir: imóveis sem contacto, com pouca procura, a precisar de revisão
          de preço, ou com anúncio a melhorar.{session.demo && " Dados de exemplo."}
        </p>

        {/* Resumo acionável */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={PhoneOff} label="Sem contacto" value={summary.noContact} />
          <Stat icon={TrendingDown} label="Pouca procura" value={summary.lowDemand} />
          <Stat icon={Tag} label="Rever preço" value={summary.suggestReview} />
          <Stat icon={ImageOff} label="Anúncio fraco" value={summary.poorAd} />
        </div>

        {/* Lista por imóvel */}
        <div className="mt-6 space-y-2">
          {items.map(({ property, leadCount }) => {
            const k = propertyKpi(property, leadCount);
            return (
              <div key={property.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{property.reference} · {property.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.municipality} · {k.daysOnMarket} dias no mercado · {k.leads} lead(s) · procura {k.interest}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${k.adQuality >= 75 ? "bg-primary/15 text-primary" : k.adQuality >= 60 ? "bg-gold/15 text-gold-foreground" : "bg-destructive/15 text-destructive"}`}>
                    Anúncio {k.adQuality}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {k.noContact && <Flag className="bg-destructive/15 text-destructive" label="Sem contacto" />}
                  {k.lowDemand && <Flag className="bg-gold/15 text-gold-foreground" label="Pouca procura" />}
                  {k.suggestReview && <Flag className="bg-gold/15 text-gold-foreground" label="Rever preço" />}
                  {!k.noContact && !k.lowDemand && !k.suggestReview && k.adQuality >= 75 && (
                    <Flag className="bg-primary/15 text-primary" label="Saudável" />
                  )}
                </div>

                {k.adIssues.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Melhorar: {k.adIssues.join(" · ")}</p>
                )}

                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Link href={`/app/imovel/${property.id}/editar`} className="text-xs font-medium text-primary hover:underline">
                    Editar anúncio
                  </Link>
                  <Link href={`/imovel/${property.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                    Ver montra
                  </Link>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Ainda não tens imóveis ativos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 font-display text-2xl leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Flag({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>;
}
