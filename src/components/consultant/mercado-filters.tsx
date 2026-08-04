"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const box =
  "rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/**
 * Motor de busca do Mercado — filtra imóveis (com comissão visível) por texto,
 * operação, tipo, quartos e preço, e ordena (recentes / maior comissão / preço).
 * Escreve nos search params; a página filtra no servidor.
 */
export function MercadoFilters({ types, total }: { types: string[]; total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");

  const set = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      router.replace(`/app/mercado?${next.toString()}`, { scroll: false });
    },
    [router, sp]
  );

  // Texto com debounce.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) set({ q });
    }, 300);
    return () => clearTimeout(t);
  }, [q, set, sp]);

  const op = sp.get("op") ?? "";
  const tipo = sp.get("tipo") ?? "";
  const quartos = sp.get("quartos") ?? "";
  const precoMax = sp.get("precoMax") ?? "";
  const sort = sp.get("sort") ?? "";
  const hasFilters = Boolean(q || op || tipo || quartos || precoMax || sort);

  return (
    <div className="mt-6 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar por título, zona ou referência…"
            className={cn(box, "w-full pl-9")}
          />
        </div>
        <select className={box} value={op} onChange={(e) => set({ op: e.target.value })}>
          <option value="">Operação</option>
          <option value="venda">Venda</option>
          <option value="arrendamento">Arrendamento</option>
        </select>
        <select className={box} value={tipo} onChange={(e) => set({ tipo: e.target.value })}>
          <option value="">Tipo</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={box} value={quartos} onChange={(e) => set({ quartos: e.target.value })}>
          <option value="">Quartos</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
        <input
          value={precoMax}
          onChange={(e) => set({ precoMax: e.target.value.replace(/\D/g, "") })}
          placeholder="Preço máx. €"
          inputMode="numeric"
          className={cn(box, "w-full sm:w-32")}
        />
        <select className={box} value={sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="">Mais recentes</option>
          <option value="comissao">Maior comissão</option>
          <option value="preco">Menor preço</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQ(""); router.replace("/app/mercado", { scroll: false }); }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" /> Limpar
          </button>
        )}
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">{total} imóvel(is) encontrado(s)</p>
    </div>
  );
}
