"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";

import { PropertyCard } from "@/components/property/property-card";
import { propertyById } from "@/lib/data/mock";
import { formatArea, formatPrice } from "@/lib/format";
import type { Property } from "@/lib/data/types";

const FAV_KEY = "housepro:favoritos";

const ROWS: { label: string; get: (p: Property) => string }[] = [
  { label: "Preço", get: (p) => formatPrice(p) },
  { label: "Operação", get: (p) => p.operation },
  { label: "Tipo", get: (p) => p.type },
  { label: "Tipologia", get: (p) => p.typology ?? "—" },
  { label: "Área bruta", get: (p) => formatArea(p.area) },
  { label: "Área útil", get: (p) => (p.areaUtil ? formatArea(p.areaUtil) : "—") },
  { label: "Quartos", get: (p) => String(p.beds) },
  { label: "Casas de banho", get: (p) => String(p.baths) },
  { label: "Estacionamento", get: (p) => (p.garage ? "Sim" : "—") },
  { label: "Elevador", get: (p) => (p.elevator ? "Sim" : "—") },
  { label: "Ano", get: (p) => (p.constructionYear ? String(p.constructionYear) : "—") },
  { label: "Certificado energético", get: (p) => p.energy },
  { label: "Localização", get: (p) => `${p.parish}, ${p.municipality}` },
];

function ComparisonModal({
  props,
  onClose,
}: {
  props: Property[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Fechar"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg">Comparar imóveis</h2>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 min-w-28 border-b bg-card p-3 text-left align-bottom text-xs font-medium text-muted-foreground">
                  Característica
                </th>
                {props.map((p) => (
                  <th
                    key={p.id}
                    className="sticky top-0 z-10 min-w-40 border-b border-l bg-card p-3 text-left align-top"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.title}
                      className="mb-2 h-20 w-full rounded-lg object-cover"
                    />
                    <Link
                      href={`/imovel/${p.id}`}
                      className="line-clamp-2 font-medium hover:text-primary"
                    >
                      {p.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ref. {p.reference}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.label} className={i % 2 ? "bg-secondary/30" : ""}>
                  <td className="sticky left-0 z-10 border-b bg-inherit p-3 text-xs font-medium text-muted-foreground">
                    {r.label}
                  </td>
                  {props.map((p) => (
                    <td key={p.id} className="border-b border-l p-3 font-medium">
                      {r.get(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FavoritesList() {
  const [ids, setIds] = React.useState<string[] | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [comparing, setComparing] = React.useState(false);

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

  const props = ids.map((id) => propertyById(id)).filter(Boolean) as Property[];

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

  const toggleSel = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  const selectedProps = props.filter((p) => selected.includes(p.id));

  return (
    <>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {props.length} {props.length === 1 ? "imóvel guardado" : "imóveis guardados"}
        </span>
        <span className="hidden sm:inline">Selecione 2 ou mais para comparar</span>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {props.map((p) => {
          const on = selected.includes(p.id);
          return (
            <div
              key={p.id}
              className={
                on
                  ? "rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }
            >
              <PropertyCard property={p} />
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleSel(p.id)}
                  className="size-4 accent-rose-600"
                />
                Comparar
              </label>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <>
          <div className="h-20" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.10)] backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <span className="text-sm font-medium">
                {selected.length} selecionado{selected.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setSelected([])}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
              <button
                disabled={selected.length < 2}
                onClick={() => setComparing(true)}
                className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                Comparar{selected.length >= 2 ? ` (${selected.length})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      {comparing && selectedProps.length >= 2 && (
        <ComparisonModal props={selectedProps} onClose={() => setComparing(false)} />
      )}
    </>
  );
}
