"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, UserPlus, CalendarClock, FileText, Clock, ChevronRight } from "lucide-react";

import { StatusBadge, type BadgeTone } from "./helix-primitives";

export interface ActionItem {
  id: string;
  icon: "lead" | "visit" | "doc" | "sla" | "task";
  title: string;
  subtitle?: string;
  /** Botão "Ligar" (tel:) — só quando há telefone. */
  phone?: string;
  /** Estado à direita (em vez do botão). */
  badge?: { tone: BadgeTone; label: string };
  href?: string;
}

const ICON = { lead: UserPlus, visit: CalendarClock, doc: FileText, sla: Clock, task: FileText };

/**
 * Centro de ação — até 5 prioridades relevantes com ações rápidas. Dados reais.
 */
export function ActionCenter({ items }: { items: ActionItem[] }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="hx-section-title text-lg">Centro de ação</h2>
        <Link href="/app/notificacoes" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--hx-blue)" }}>
          Ver tudo <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="hx-card mt-3 divide-y divide-[var(--hx-border)]">
        {items.slice(0, 5).map((it) => {
          const Icon = ICON[it.icon];
          const Row = (
            <div className="flex items-center gap-3 p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--hx-surface-blue)", color: "var(--hx-blue)" }}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{it.title}</p>
                {it.subtitle && <p className="truncate text-sm hx-muted">{it.subtitle}</p>}
              </div>
              {it.phone ? (
                <a href={`tel:${it.phone}`} onClick={(e) => e.stopPropagation()} className="hx-btn hx-btn-outline-red shrink-0">
                  <Phone className="size-4" /> Ligar
                </a>
              ) : it.badge ? (
                <StatusBadge tone={it.badge.tone}>{it.badge.label}</StatusBadge>
              ) : null}
            </div>
          );
          return it.href ? (
            <Link key={it.id} href={it.href} className="block transition-colors hover:bg-[var(--hx-surface-blue)]/60">
              {Row}
            </Link>
          ) : (
            <div key={it.id}>{Row}</div>
          );
        })}
        {items.length === 0 && <p className="p-6 text-center text-sm hx-muted">Sem prioridades por agora. 🎉</p>}
      </div>
    </section>
  );
}
