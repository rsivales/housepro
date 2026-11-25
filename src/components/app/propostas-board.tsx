"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PropostaBoardRow } from "@/lib/db/deal-offers";

type Tab = "pendentes" | "aceites" | "outros" | "historico";

const TABS: { key: Tab; label: string }[] = [
  { key: "pendentes", label: "Pendentes" },
  { key: "aceites", label: "Aceites" },
  { key: "outros", label: "Outros" },
  { key: "historico", label: "Histórico" },
];

const currency = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Em que separador cai o negócio: o estado final do negócio (concluído/
 *  cancelado) manda sempre sobre o estado da ronda de proposta em curso. */
function bucketOf(row: PropostaBoardRow): Tab {
  if (["concluido", "cancelado"].includes(row.stage)) return "historico";
  const status = row.latestOffer?.status;
  if (status === "aceite") return "aceites";
  if (status === "recusada" || status === "substituida") return "outros";
  if (status === "pendente") return "pendentes";
  // Negócio sem ronda registada ainda (criado antes desta funcionalidade).
  return row.stage === "proposta_enviada" ? "pendentes" : "aceites";
}

export function PropostasBoard({ rows }: { rows: PropostaBoardRow[] }) {
  const [tab, setTab] = React.useState<Tab>("pendentes");
  const [type, setType] = React.useState<"todas" | "interna" | "externa">("todas");
  const [q, setQ] = React.useState("");

  const bucketed = React.useMemo(() => rows.map((r) => ({ row: r, tab: bucketOf(r) })), [rows]);
  const counts = React.useMemo(() => {
    const c: Record<Tab, number> = { pendentes: 0, aceites: 0, outros: 0, historico: 0 };
    for (const b of bucketed) c[b.tab]++;
    return c;
  }, [bucketed]);

  const needle = q.trim().toLowerCase();
  const filtered = bucketed
    .filter((b) => b.tab === tab)
    .filter((b) => (type === "todas" ? true : type === "externa" ? b.row.coBroker : !b.row.coBroker))
    .filter((b) =>
      !needle
        ? true
        : [b.row.propertyRef, b.row.propertyTitle, b.row.buyerName, b.row.sellerName, b.row.angariadorName, b.row.consultorName]
            .join(" ")
            .toLowerCase()
            .includes(needle),
    )
    .map((b) => b.row);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-full border bg-card p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="ml-1 text-xs opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="todas">Internas e externas</option>
            <option value="interna">Internas (mesma agência)</option>
            <option value="externa">Externas (outra agência)</option>
          </select>
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Pesquisar imóvel, comprador, agente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-lg border py-1.5 pl-8 pr-3 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Imóvel</th>
              <th className="px-4 py-2 font-medium">Angariador</th>
              <th className="px-4 py-2 font-medium">Consultor comprador</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Sem negócios neste separador.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.dealId} className="border-b last:border-0 hover:bg-secondary/30">
                <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                  {new Date(row.latestOffer?.createdAt ?? row.updatedAt).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/app/crm/${row.dealId}`} className="font-medium hover:underline">
                    {row.propertyRef}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.propertyTitle}</p>
                </td>
                <td className="px-4 py-2">
                  {row.angariadorName}
                  <p className="text-xs text-muted-foreground">{row.angariadorAgency}</p>
                </td>
                <td className="px-4 py-2">
                  {row.consultorName}
                  <p className="text-xs text-muted-foreground">{row.consultorAgency}</p>
                  {row.coBroker && <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs">Externa</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium">{currency(row.currentAmount)}</td>
                <td className="px-4 py-2 text-muted-foreground">{row.latestOffer ? row.latestOffer.status : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
