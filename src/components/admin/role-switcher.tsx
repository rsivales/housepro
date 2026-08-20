"use client";

import * as React from "react";
import { Check, Eye, ShieldHalf, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { agents } from "@/lib/data/mock";
import { ROLE_LABEL, ROLE_ORDER, VIEW_AS_COOKIE } from "@/lib/data/roles";
import type { RoleKey } from "@/lib/data/types";

/**
 * Vista de supervisão do Super Admin — "ver como" qualquer papel, para analisar
 * comportamentos, relações e acessos entre os diferentes roles. Só aparece em
 * modo demo (protótipo). Guarda a escolha num cookie lido pelo servidor.
 */
export function RoleSwitcher({ currentId }: { currentId: string }) {
  const [open, setOpen] = React.useState(false);

  function viewAs(id: string) {
    document.cookie = `${VIEW_AS_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    window.location.reload();
  }

  const current = agents.find((a) => a.id === currentId);
  // Agrupa por papel, na ordem hierárquica.
  const byRole = ROLE_ORDER
    .map((role) => ({ role, list: agents.filter((a) => (a.roleKey ?? "agente") === role) }))
    .filter((g) => g.list.length > 0);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 left-4 z-[60] inline-flex items-center gap-2 rounded-full border bg-card/95 px-3.5 py-2 text-sm font-medium shadow-lg backdrop-blur transition-colors hover:bg-secondary"
        title="Vista de supervisão (Super Admin)"
      >
        <ShieldHalf className="size-4 text-primary" />
        <span className="max-w-[9rem] truncate">
          {current ? current.name : "Supervisão"}
        </span>
        <span className="hidden rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ver como
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed bottom-36 left-4 z-[60] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border bg-card p-3 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Eye className="size-4 text-primary" /> Ver como
              </p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <p className="px-1 pb-2 text-xs text-muted-foreground">
              Navega entre papéis para analisar acessos e comportamentos. A área
              adapta-se ao papel escolhido.
            </p>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {byRole.map(({ role, list }) => (
                <div key={role}>
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {ROLE_LABEL[role as RoleKey]}
                  </p>
                  <div className="mt-1 space-y-1">
                    {list.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => viewAs(a.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                          a.id === currentId && "bg-secondary"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{a.name}</span>
                          {a.agency && <span className="block truncate text-[11px] text-muted-foreground">{a.agency}</span>}
                        </span>
                        {a.id === currentId && <Check className="size-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
