"use client";

import * as React from "react";

import type { Property } from "@/lib/data/types";
import {
  applyOrdering,
  ORDERING_LABELS,
  type OrderingRule,
} from "@/lib/data/ordering";
import { siteConfig, HOME_RULE_KEY } from "@/lib/config";
import { loadSiteContent } from "@/lib/data/site-content";
import { PropertyCard } from "@/components/property/property-card";

/**
 * Homepage "Mais imóveis" grid. The ordering rule is set by the admin
 * (persisted per browser here; cross-user persistence arrives with the
 * back office in M5).
 */
export function MoreProperties({ properties }: { properties: Property[] }) {
  const [rule, setRule] = React.useState<OrderingRule>(siteConfig.homeMoreRule);

  React.useEffect(() => {
    loadSiteContent().then((c) => {
      const stored = (c.homerule as OrderingRule) ?? (localStorage.getItem(HOME_RULE_KEY) as OrderingRule | null);
      if (stored && stored in ORDERING_LABELS) setRule(stored);
    });
  }, []);

  const ordered = applyOrdering(properties, rule);

  return (
    <>
      <p className="mt-2 text-sm text-muted-foreground">
        Regra: <span className="font-medium text-foreground">{ORDERING_LABELS[rule]}</span>{" "}
        · configurável no admin
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </>
  );
}
