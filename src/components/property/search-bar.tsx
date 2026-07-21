"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, KeyRound, Home, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TabKey = "comprar" | "arrendar" | "vender" | "investir";

const tabs: {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  cta: string;
  hint: string;
  build: (v: string) => string;
}[] = [
  {
    key: "comprar",
    label: "Comprar",
    icon: Home,
    placeholder: "Distrito, concelho ou freguesia…",
    cta: "Procurar",
    hint: "Imóveis para compra filtrados por localização.",
    build: (v) => `/imoveis?operacao=comprar&local=${encodeURIComponent(v)}`,
  },
  {
    key: "arrendar",
    label: "Arrendar",
    icon: KeyRound,
    placeholder: "Onde quer arrendar?",
    cta: "Procurar",
    hint: "Arrendamentos filtrados por localização.",
    build: (v) => `/imoveis?operacao=arrendar&local=${encodeURIComponent(v)}`,
  },
  {
    key: "vender",
    label: "Vender",
    icon: Tag,
    placeholder: "Morada do imóvel a vender…",
    cta: "Avaliar",
    hint: "Avaliação gratuita e plano de venda com um consultor.",
    build: (v) => `/vender?morada=${encodeURIComponent(v)}`,
  },
  {
    key: "investir",
    label: "Investir",
    icon: TrendingUp,
    placeholder: "Orçamento ou zona de interesse…",
    cta: "Ver soluções",
    hint: "Oportunidades por rentabilidade, reabilitação e revenda.",
    build: (v) => `/investir?perfil=${encodeURIComponent(v)}`,
  },
];

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = React.useState<TabKey>("comprar");
  const [value, setValue] = React.useState("");

  const tab = tabs.find((t) => t.key === active)!;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(tab.build(value.trim()));
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur",
        className
      )}
    >
      {/* Tabs */}
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 sm:grid-cols-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            aria-pressed={active === t.key}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={tab.placeholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={tab.label}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          variant={active === "vender" || active === "investir" ? "brand" : "default"}
          className="sm:px-8"
        >
          {tab.cta}
        </Button>
      </form>

      <p className="px-3 pb-1 pt-1.5 text-xs text-muted-foreground">{tab.hint}</p>
    </div>
  );
}
