import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { properties, agentById, agencyById } from "@/lib/data/mock";
import { formatPrice } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/data/status";

export const metadata: Metadata = { title: "Imóveis · Back office" };

export default function AdminImoveisPage() {
  const activos = properties.filter((p) => p.status !== "vendido");

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Building2 className="size-7 text-primary" /> Imóveis ativos ({activos.length})
        </h1>

        <ul className="mt-6 space-y-2">
          {activos.map((p) => {
            const agent = agentById(p.agentId);
            const agency = agencyById(agent.agencyId);
            return (
              <li key={p.id}>
                <Link
                  href={`/imovel/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.reference} · {p.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.parish}, {p.municipality} · {agency?.name ?? agent.agency} · {agent.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{formatPrice(p)}</p>
                    {p.status && (
                      <p className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
