"use client";

import * as React from "react";
import Link from "next/link";
import { Settings, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import {
  ORDERING_LABELS,
  ORDERING_RULES,
  type OrderingRule,
} from "@/lib/data/ordering";
import { siteConfig, HOME_RULE_KEY } from "@/lib/config";

export default function AdminPage() {
  const [rule, setRule] = React.useState<OrderingRule>(siteConfig.homeMoreRule);

  React.useEffect(() => {
    const stored = localStorage.getItem(HOME_RULE_KEY) as OrderingRule | null;
    if (stored && stored in ORDERING_LABELS) setRule(stored);
  }, []);

  function choose(r: OrderingRule) {
    setRule(r);
    localStorage.setItem(HOME_RULE_KEY, r);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Settings className="size-4" /> Back office (protótipo)
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Configuração do site</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Definições editáveis pela marca/coordenador. Nesta fase são guardadas
          no navegador; com o back office (M5 + autenticação) passam a ser
          persistidas por agência no Supabase.
        </p>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-medium">
            Homepage · secção “Mais imóveis para si”
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Que imóveis mostrar abaixo dos destaques.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ORDERING_RULES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => choose(r)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  rule === r
                    ? "border-primary bg-primary/5 font-medium text-foreground"
                    : "hover:bg-secondary"
                )}
              >
                {ORDERING_LABELS[r]}
              </button>
            ))}
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver a homepage <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
