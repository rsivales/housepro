"use client";

import * as React from "react";
import { ChevronDown, Eye, ShieldHalf, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLE_LABEL, PROD_VIEW_AS_COOKIE } from "@/lib/data/roles";
import type { RoleKey } from "@/lib/data/types";

interface RealProfile { id: string; name: string; role_key?: RoleKey | null; agency?: string | null }

function setViewAsCookie(id: string | null) {
  if (id) {
    document.cookie = `${PROD_VIEW_AS_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 8}`;
  } else {
    document.cookie = `${PROD_VIEW_AS_COOKIE}=; path=/; max-age=0`;
  }
  window.location.reload();
}

/**
 * Faixa fixa no topo: indica sempre quem está autenticado e com que papel.
 * Quando a identidade REAL é Super Admin, também mostra o seletor "Ver como"
 * — navega a app com o papel de outro consultor real (gates de página/API),
 * sem precisar de outra conta/email. É só para inspeção/navegação: ações que
 * gravam dados continuam identificadas pelo login real ao nível da base de
 * dados, por isso algumas escritas continuam sujeitas às regras reais.
 */
export function RoleStatusBar({
  name,
  roleLabel,
  canSwitch,
  viewingAs,
  realName,
}: {
  name: string;
  roleLabel: string;
  canSwitch: boolean;
  viewingAs: boolean;
  realName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [profiles, setProfiles] = React.useState<RealProfile[] | null>(null);

  React.useEffect(() => {
    if (!open || profiles !== null) return;
    fetch("/api/me/view-as")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((j) => setProfiles(j.profiles ?? []))
      .catch(() => setProfiles([]));
  }, [open, profiles]);

  return (
    <div
      className={cn(
        "relative z-40 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-1.5 text-xs sm:px-6",
        viewingAs ? "border-amber-500/40 bg-amber-500/10 text-amber-900" : "border-border bg-secondary/40 text-muted-foreground"
      )}
    >
      <span>
        {viewingAs ? (
          <>A ver como <strong className="font-semibold">{name}</strong> · {roleLabel} <span className="opacity-70">(sessão real: {realName})</span></>
        ) : (
          <>Autenticado como <strong className="font-semibold">{name}</strong> · {roleLabel}</>
        )}
      </span>

      {viewingAs ? (
        <button
          onClick={() => setViewAsCookie(null)}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/40 bg-white/60 px-2.5 py-1 font-medium text-amber-900 hover:bg-white"
        >
          <X className="size-3.5" /> Sair da visualização
        </button>
      ) : canSwitch ? (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium hover:bg-secondary"
          >
            <ShieldHalf className="size-3.5" /> Ver como <ChevronDown className="size-3" />
          </button>
          {open && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} tabIndex={-1} />
              <div className="absolute right-0 z-50 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border bg-card p-1.5 text-sm text-foreground shadow-xl">
                {profiles === null && <p className="p-3 text-muted-foreground">A carregar…</p>}
                {profiles?.length === 0 && <p className="p-3 text-muted-foreground">Sem outros consultores.</p>}
                {profiles?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setViewAsCookie(p.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-secondary"
                  >
                    <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.role_key ? ROLE_LABEL[p.role_key] : "Consultor"}{p.agency ? ` · ${p.agency}` : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
