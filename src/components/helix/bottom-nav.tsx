"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Plus, X, KanbanSquare, Menu,
  UserPlus, Building2, Phone, ListChecks, Mail, CalendarClock, Megaphone,
} from "lucide-react";

type Tab = "inicio" | "leads" | "pipeline" | "menu" | "none";

function tabFor(path: string): Tab {
  if (path === "/app") return "inicio";
  if (path.startsWith("/app/contactos")) return "leads";
  if (path.startsWith("/app/meta/pipeline") || path.startsWith("/app/crm")) return "pipeline";
  if (path.startsWith("/app/menu")) return "menu";
  return "none";
}

const QUICK = [
  { label: "Lead", icon: UserPlus, href: "/app/contactos" },
  { label: "Imóvel", icon: Building2, href: "/app/imovel/novo" },
  { label: "Chamada", icon: Phone, href: "/app/x-call" },
  { label: "Tarefa", icon: ListChecks, href: "/app/agenda" },
  { label: "E-mail", icon: Mail, href: "/app/x-campaigns" },
  { label: "Visita", icon: CalendarClock, href: "/app/agenda" },
  { label: "Campanha", icon: Megaphone, href: "/app/meta/campanhas" },
];

/**
 * Navegação inferior fixa + botão central "+" (FAB) que abre ações rápidas em
 * leque. O "+" roda para "×" quando aberto. Animação fluida (tipo dock), com
 * recolha subtil; desativada quando "reduzir movimento" está ativo (via CSS).
 */
export function MobileBottomNavigation() {
  const [open, setOpen] = React.useState(false);
  const active = tabFor(usePathname() ?? "/app");

  // Posições em arco (semicírculo superior) para as ações.
  const R = 116;
  const items = QUICK.map((q, i) => {
    const t = QUICK.length === 1 ? 0.5 : i / (QUICK.length - 1);
    const angle = (200 + t * 140) * (Math.PI / 180); // 200°→340°
    return { ...q, x: Math.cos(angle) * R, y: Math.sin(angle) * R };
  });

  return (
    <>
      {/* Scrim quando aberto */}
      {open && <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-[rgba(11,31,58,0.28)] backdrop-blur-[1px] lg:hidden" />}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        {/* Leque de ações rápidas */}
        <div className="pointer-events-none relative mx-auto max-w-6xl">
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="hx-fan-item pointer-events-auto absolute flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{
                    transform: open ? `translate(${it.x}px, ${it.y}px)` : "translate(0,0)",
                    opacity: open ? 1 : 0,
                    transition: `transform .32s cubic-bezier(.2,.8,.2,1) ${i * 22}ms, opacity .24s ${i * 22}ms`,
                    pointerEvents: open ? "auto" : "none",
                  }}
                  aria-hidden={!open}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="grid size-11 place-items-center rounded-full text-white shadow-lg" style={{ background: "var(--hx-navy)" }}>
                    <Icon className="size-5" />
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold shadow" style={{ color: "var(--hx-navy)" }}>
                    {it.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Barra */}
        <div className="mx-auto flex max-w-6xl items-end justify-around border-t border-[var(--hx-border)] bg-[var(--hx-surface)] px-2 pt-1.5 pb-2 shadow-[0_-6px_20px_-12px_rgba(11,31,58,0.25)]">
          <TabLink href="/app" icon={Home} label="Início" active={active === "inicio"} />
          <TabLink href="/app/contactos" icon={Users} label="Leads" active={active === "leads"} />

          {/* FAB central */}
          <div className="relative -mt-7 w-16 shrink-0">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar ações" : "Novo"}
              aria-expanded={open}
              className="mx-auto grid size-16 place-items-center rounded-full text-white shadow-xl transition-transform"
              style={{ background: "var(--hx-red)", transform: open ? "rotate(135deg)" : "none" }}
            >
              {open ? <X className="size-7" /> : <Plus className="size-7" />}
            </button>
          </div>

          <TabLink href="/app/meta/pipeline" icon={KanbanSquare} label="Pipeline" active={active === "pipeline"} />
          <TabLink href="/app/menu" icon={Menu} label="Menu" active={active === "menu"} />
        </div>
      </nav>
    </>
  );
}

function TabLink({ href, icon: Icon, label, active }: { href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; active?: boolean }) {
  return (
    <Link href={href} className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1" aria-current={active ? "page" : undefined}>
      <Icon className="size-5" style={{ color: active ? "var(--hx-red)" : "var(--hx-text-2)" }} />
      <span className="text-[11px] font-semibold" style={{ color: active ? "var(--hx-red)" : "var(--hx-text-2)" }}>{label}</span>
    </Link>
  );
}
