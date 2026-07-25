"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { PropertyCard } from "@/components/property/property-card";
import { propertyById } from "@/lib/data/mock";
import type { Property } from "@/lib/data/types";

const FAV_KEY = "housepro:favoritos";

export function FavoritesList() {
  const [ids, setIds] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      setIds([]);
    }
  }, []);

  if (ids === null) {
    return <p className="mt-8 text-sm text-muted-foreground">A carregar…</p>;
  }

  const props = ids
    .map((id) => propertyById(id))
    .filter(Boolean) as Property[];

  if (props.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Heart className="size-6" />
        </div>
        <h2 className="mt-4 font-display text-xl">Ainda sem favoritos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore os imóveis e toque no ♥ para os guardar aqui.
        </p>
        <Link
          href="/imoveis"
          className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Ver imóveis
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {props.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}
