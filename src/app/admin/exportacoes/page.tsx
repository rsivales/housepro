import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Rss, Check, X, AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { PortalContracts } from "@/components/admin/portal-contracts";
import { portalIntegrations, exportReadiness } from "@/lib/data/exports";
import { properties } from "@/lib/data/mock";

export const metadata: Metadata = { title: "Exportações · Back office" };

export default function ExportacoesPage() {
  const catalog = properties.filter((p) => p.status !== "vendido");
  const feedable = catalog.map((p) => ({ p, r: exportReadiness(p) }));

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>

        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Rss className="size-7 text-primary" /> Exportações & portais
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gestão dos contratos de exportação com portais. Ative integrações,
          verifique o estado e os condicionalismos que impedem a exportação de
          cada imóvel. O feed HousePro está em{" "}
          <code className="rounded bg-secondary px-1">/api/idealista-feed</code>.
        </p>

        {/* Portais */}
        <PortalContracts initial={portalIntegrations} />

        {/* Estado de exportação por imóvel */}
        <section className="mt-10">
          <h2 className="font-display text-xl">Estado de exportação por imóvel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Condicionalismos que impedem a publicação nos portais.
          </p>
          <div className="mt-4 space-y-2">
            {feedable.map(({ p, r }) => (
              <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.reference} · {p.parish}, {p.municipality}</p>
                  </div>
                  {r.ready ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      <Check className="size-3.5" /> Pronto a exportar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
                      <X className="size-3.5" /> Bloqueado
                    </span>
                  )}
                </div>
                {!r.ready && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {r.blockers.map((b) => (
                      <li key={b} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="size-3" /> {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
