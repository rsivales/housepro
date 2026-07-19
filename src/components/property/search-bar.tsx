"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const operations = ["Comprar", "Arrendar"] as const;

export function SearchBar({ className }: { className?: string }) {
  const [op, setOp] = React.useState<(typeof operations)[number]>("Comprar");

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur",
        className
      )}
    >
      <div className="mb-2 flex gap-1 rounded-xl bg-secondary p-1">
        {operations.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOp(o)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              op === o
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Distrito, concelho ou freguesia…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Localização"
          />
        </div>
        <Button type="submit" size="lg" className="sm:px-8">
          Procurar
        </Button>
      </form>
    </div>
  );
}
