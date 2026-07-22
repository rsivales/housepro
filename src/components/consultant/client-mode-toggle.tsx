"use client";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useClientMode, setClientMode } from "@/lib/client-mode";

/** Interruptor "Modo cliente" — esconde a informação interna no ecrã. */
export function ClientModeToggle({ className }: { className?: string }) {
  const { ready, clientMode } = useClientMode();
  const on = ready && clientMode;
  return (
    <button
      type="button"
      onClick={() => setClientMode(!on)}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-secondary",
        className
      )}
      title="Esconde comissões e informação interna para mostrar ao cliente"
    >
      {on ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      Modo cliente{on ? ": ativo" : ""}
    </button>
  );
}
