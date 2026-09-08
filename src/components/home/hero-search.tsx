"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Crown, Globe2, Home, MapPin, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

type TabKey = "comprar" | "arrendar" | "investir";
type ScopeKey = "imoveis" | "empreendimentos" | "signature" | "internacional";

const TABS: { key: TabKey; label: string }[] = [
  { key: "comprar", label: "Comprar" },
  { key: "arrendar", label: "Arrendar" },
  { key: "investir", label: "Investir" },
];

const SCOPES: { key: ScopeKey; label: string; icon: React.ElementType }[] = [
  { key: "imoveis", label: "Imóveis", icon: Home },
  { key: "empreendimentos", label: "Empreendimentos", icon: Building2 },
  { key: "signature", label: "Signature", icon: Crown },
  { key: "internacional", label: "Internacional", icon: Globe2 },
];

/** Motor de pesquisa da homepage, incluindo filtros avançados no próprio painel. */
export function HeroSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = React.useState<TabKey>("comprar");
  const [scope, setScope] = React.useState<ScopeKey>("imoveis");
  const [value, setValue] = React.useState("");
  const [advanced, setAdvanced] = React.useState(false);
  const [propertyType, setPropertyType] = React.useState("");
  const [bedrooms, setBedrooms] = React.useState("");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");

  function destination() {
    const q = value.trim();
    if (scope === "empreendimentos") return `/empreendimentos${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    if (scope === "signature") return `/signature${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    if (scope === "internacional") return `/internacional${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    if (active === "investir") return `/investir${q ? `?perfil=${encodeURIComponent(q)}` : ""}`;

    const params = new URLSearchParams({ operacao: active });
    if (q) params.set("local", q);
    if (propertyType) params.set("tipo", propertyType);
    if (bedrooms) params.set("quartos", bedrooms);
    if (minPrice) params.set("precoMin", minPrice);
    if (maxPrice) params.set("precoMax", maxPrice);
    return `/imoveis?${params.toString()}`;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    router.push(destination());
  }

  function selectScope(next: ScopeKey) {
    setScope(next);
    if (next !== "imoveis") setAdvanced(false);
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-2xl sm:p-5", className)} style={{ boxShadow: "0 30px 60px -30px rgba(11,31,58,0.45)" }}>
      <div className="flex items-center gap-6 border-b" role="tablist" aria-label="Tipo de operação">
        {TABS.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key} onClick={() => setActive(tab.key)} className="relative -mb-px min-h-11 pb-3 pt-1 text-sm font-semibold" style={{ color: active === tab.key ? "var(--hp-navy)" : "var(--muted-foreground)" }}>{tab.label}{active === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ background: "var(--hp-red)" }} />}</button>)}
      </div>

      <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1" aria-label="Coleção a pesquisar">
        {SCOPES.map((item) => <button key={item.key} type="button" onClick={() => selectScope(item.key)} aria-pressed={scope === item.key} className={cn("inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition", scope === item.key ? "border-[var(--hp-navy)] bg-[var(--hp-navy)] text-white" : "border-border bg-background text-muted-foreground")}><item.icon className="size-4" />{item.label}</button>)}
      </div>

      <form onSubmit={onSubmit} className="mt-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-3" style={{ background: "var(--secondary)" }}><MapPin className="size-5 shrink-0" style={{ color: "var(--hp-navy)" }} /><input type="text" value={value} onChange={(event) => setValue(event.target.value)} placeholder={scope === "internacional" ? "País, cidade ou projeto…" : scope === "empreendimentos" ? "Zona ou nome do empreendimento…" : scope === "signature" ? "Localização ou inspiração…" : "Onde quer viver?"} aria-label="Localização ou projeto" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
          <button type="submit" aria-label="Procurar" className="hp-btn-red grid size-12 shrink-0 place-items-center rounded-xl shadow-md"><ArrowRight className="size-5" /></button>
        </div>

        {scope === "imoveis" && active !== "investir" && <div className="mt-2 text-center"><button type="button" aria-expanded={advanced} aria-controls="homepage-advanced-search" onClick={() => setAdvanced((open) => !open)} className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><SlidersHorizontal className="size-4" />{advanced ? "Fechar filtros" : "Pesquisa avançada"}</button></div>}

        {advanced && scope === "imoveis" && active !== "investir" && <div id="homepage-advanced-search" className="mt-2 rounded-xl border bg-secondary/45 p-3 text-left"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar imóveis</p><button type="button" onClick={() => setAdvanced(false)} aria-label="Fechar filtros" className="grid size-9 place-items-center rounded-full hover:bg-background"><X className="size-4" /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect label="Tipo de imóvel" value={propertyType} onChange={setPropertyType} options={["Apartamento", "Moradia", "Terreno", "Quinta"]} /><FilterSelect label="Quartos" value={bedrooms} onChange={setBedrooms} options={["1", "2", "3", "4", "5+"]} /><FilterInput label="Preço mínimo" value={minPrice} onChange={setMinPrice} placeholder="150 000 €" /><FilterInput label="Preço máximo" value={maxPrice} onChange={setMaxPrice} placeholder="750 000 €" /></div><button type="submit" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--hp-navy)] px-5 text-sm font-semibold text-white sm:w-auto">Aplicar filtros <ArrowRight className="size-4" /></button></div>}
      </form>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="text-xs font-medium text-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option === "5+" ? "5 ou mais" : option}</option>)}</select></label>;
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="text-xs font-medium text-foreground">{label}<input inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} placeholder={placeholder} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none" /></label>;
}
