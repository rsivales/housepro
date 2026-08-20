"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, KanbanSquare, CalendarClock, Menu as MenuIcon,
  Plus, X, PanelLeftClose, PanelLeftOpen,
  UserPlus, Building2, Phone, ListChecks, Mail,
} from "lucide-react";

function activeFor(path: string): string {
  if (path === "/app") return "inicio";
  if (path.startsWith("/app/contactos")) return "leads";
  if (path.startsWith("/app/meta/pipeline") || path.startsWith("/app/crm")) return "pipeline";
  if (path.startsWith("/app/agenda")) return "agenda";
  if (path.startsWith("/app/menu")) return "menu";
  return "";
}

const NAV = [
  { key: "inicio", label: "Início", href: "/app", icon: Home },
  { key: "leads", label: "Leads", href: "/app/contactos", icon: Users },
  { key: "pipeline", label: "Pipeline", href: "/app/meta/pipeline", icon: KanbanSquare },
  { key: "agenda", label: "Agenda", href: "/app/agenda", icon: CalendarClock },
  { key: "menu", label: "Menu", href: "/app/menu", icon: MenuIcon },
] as const;

const QUICK = [
  { label: "Lead", icon: UserPlus, href: "/app/contactos" },
  { label: "Imóvel", icon: Building2, href: "/app/imovel/novo" },
  { label: "Chamada", icon: Phone, href: "/app/x-call" },
  { label: "Tarefa", icon: ListChecks, href: "/app/agenda?novo=tarefa" },
  { label: "E-mail", icon: Mail, href: "/app/x-campaigns" },
];

/** Barra lateral recolhível (desktop/tablet lg+). Só aparece em ecrãs largos. */
export function HelixSidebar() {
  const [expanded, setExpanded] = React.useState(false);
  const [quick, setQuick] = React.useState(false);
  const active = activeFor(usePathname() ?? "/app");

  React.useEffect(() => {
    try { setExpanded(localStorage.getItem("helix:sidebar") === "1"); } catch {}
  }, []);
  function toggle() {
    setExpanded((v) => {
      const n = !v;
      try { localStorage.setItem("helix:sidebar", n ? "1" : "0"); } catch {}
      return n;
    });
  }

  return (
    <aside
      className="fixed left-0 top-14 bottom-0 z-30 hidden flex-col border-r border-[var(--hx-border)] bg-[var(--hx-surface)] py-3 transition-[width] lg:flex"
      style={{ width: expanded ? 216 : 76 }}
    >
      {/* Novo */}
      <div className="relative px-3">
        <button
          onClick={() => setQuick((v) => !v)}
          className="flex h-11 w-full items-center gap-3 rounded-full px-3 text-white"
          style={{ background: "var(--hx-red)" }}
          aria-label="Novo"
          aria-expanded={quick}
        >
          <span className="grid size-6 shrink-0 place-items-center">{quick ? <X className="size-5" /> : <Plus className="size-5" />}</span>
          {expanded && <span className="font-semibold">Novo</span>}
        </button>
        {quick && (
          <>
            <button aria-hidden tabIndex={-1} onClick={() => setQuick(false)} className="fixed inset-0 z-30" />
            <div className="absolute left-3 right-0 z-40 mt-2 w-52 rounded-2xl border border-[var(--hx-border)] bg-[var(--hx-surface)] p-1 shadow-xl">
              {QUICK.map((q) => {
                const Icon = q.icon;
                return (
                  <Link key={q.label} href={q.href} onClick={() => setQuick(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-[var(--hx-surface-blue)]">
                    <Icon className="size-4 hx-muted" /> {q.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Navegação */}
      <nav className="mt-3 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((it) => {
          const Icon = it.icon;
          const on = active === it.key;
          return (
            <Link
              key={it.key}
              href={it.href}
              className="flex h-11 items-center gap-3 rounded-xl px-3 font-medium"
              style={{ background: on ? "var(--hx-surface-blue)" : "transparent", color: on ? "var(--hx-navy)" : "var(--hx-text-2)" }}
              aria-current={on ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" style={{ color: on ? "var(--hx-red)" : "var(--hx-text-2)" }} />
              {expanded && <span>{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Recolher */}
      <div className="px-3">
        <button onClick={toggle} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 hx-muted hover:bg-[var(--hx-surface-blue)]" aria-label={expanded ? "Recolher" : "Expandir"}>
          {expanded ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          {expanded && <span className="text-sm">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
