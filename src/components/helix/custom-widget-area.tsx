"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus, X, ArrowUp, ArrowDown, RotateCcw,
  CalendarClock, ListChecks, Users, Filter, Gauge, Megaphone, Coins, Wallet, Target, GraduationCap, CloudSun, Home, Star,
} from "lucide-react";

const KEY = "helix:widgets";

interface WidgetDef {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
}

const CATALOG: WidgetDef[] = [
  { key: "agenda", label: "Agenda", href: "/app/agenda", icon: CalendarClock, note: "Tarefas e visitas" },
  { key: "tarefas", label: "Tarefas", href: "/app/agenda", icon: ListChecks, note: "O que há a fazer" },
  { key: "leads", label: "Leads", href: "/app/contactos", icon: Users, note: "Contactos e leads" },
  { key: "funil", label: "Funil", href: "/app/meta/pipeline", icon: Filter, note: "Pipeline de leads" },
  { key: "desempenho", label: "Desempenho de imóveis", href: "/app/desempenho", icon: Gauge, note: "Sem contacto, rever preço" },
  { key: "campanhas", label: "Campanhas", href: "/app/x-campaigns", icon: Megaphone, note: "Email e Meta" },
  { key: "comissoes", label: "Comissões", href: "/app/comissoes", icon: Coins, note: "Faturação e override" },
  { key: "faturacao", label: "Faturação", href: "/app/pagamentos", icon: Wallet, note: "Produção e pagamentos" },
  { key: "objetivos", label: "Objetivos", href: "/app/objetivos", icon: Target, note: "Metas e prémios" },
  { key: "formacao", label: "Formação", href: "/app/formacao", icon: GraduationCap, note: "Academia" },
  { key: "meteo", label: "Meteorologia", href: "#", icon: CloudSun, note: "Tempo local" },
  { key: "imoveis", label: "Imóveis recentes", href: "/app/desempenho", icon: Home, note: "Últimas angariações" },
  { key: "atalhos", label: "Atalhos favoritos", href: "/app", icon: Star, note: "Acesso rápido" },
];

const byKey = (k: string) => CATALOG.find((w) => w.key === k);

export function CustomWidgetArea() {
  const [keys, setKeys] = React.useState<string[]>([]);
  const [picking, setPicking] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setKeys(JSON.parse(raw));
    } catch {}
  }, []);
  function persist(next: string[]) {
    setKeys(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
  const add = (k: string) => { if (!keys.includes(k)) persist([...keys, k]); setPicking(false); };
  const remove = (k: string) => persist(keys.filter((x) => x !== k));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= keys.length) return;
    const next = [...keys];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  return (
    <section>
      {keys.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="hx-section-title text-lg">A minha área de trabalho</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing((v) => !v)} className="text-sm font-semibold" style={{ color: "var(--hx-blue)" }}>
              {editing ? "Concluir" : "Editar"}
            </button>
            {editing && (
              <button onClick={() => persist([])} className="inline-flex items-center gap-1 text-sm hx-muted" title="Repor">
                <RotateCcw className="size-4" /> Repor
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {keys.map((k, i) => {
          const w = byKey(k);
          if (!w) return null;
          const Icon = w.icon;
          return (
            <div key={k} className="hx-card flex items-center gap-3 p-3.5">
              <span className="grid size-9 place-items-center rounded-full" style={{ background: "var(--hx-surface-blue)", color: "var(--hx-navy)" }}>
                <Icon className="size-5" />
              </span>
              <Link href={w.href} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{w.label}</p>
                <p className="truncate text-xs hx-muted">{w.note}</p>
              </Link>
              {editing && (
                <div className="flex items-center gap-1">
                  <button aria-label="Subir" onClick={() => move(i, -1)} className="hx-icon-btn !size-8 !rounded-lg"><ArrowUp className="size-4" /></button>
                  <button aria-label="Descer" onClick={() => move(i, 1)} className="hx-icon-btn !size-8 !rounded-lg"><ArrowDown className="size-4" /></button>
                  <button aria-label="Remover" onClick={() => remove(k)} className="hx-icon-btn !size-8 !rounded-lg" style={{ color: "var(--hx-red)" }}><X className="size-4" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar */}
      <button
        onClick={() => setPicking((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--hx-radius)] border-2 border-dashed border-[var(--hx-border)] py-3.5 text-sm font-semibold transition-colors hover:bg-[var(--hx-surface-blue)]/50"
        style={{ color: "var(--hx-blue)" }}
      >
        <Plus className="size-5" /> Adicionar ao dashboard
      </button>

      {picking && (
        <div className="hx-card mt-2 p-2">
          <div className="grid gap-1 sm:grid-cols-2">
            {CATALOG.filter((w) => !keys.includes(w.key)).map((w) => {
              const Icon = w.icon;
              return (
                <button key={w.key} onClick={() => add(w.key)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--hx-surface-blue)]">
                  <Icon className="size-4 hx-muted" /> {w.label}
                </button>
              );
            })}
          </div>
          {CATALOG.every((w) => keys.includes(w.key)) && <p className="p-3 text-center text-sm hx-muted">Já adicionaste todos os widgets.</p>}
        </div>
      )}
    </section>
  );
}
