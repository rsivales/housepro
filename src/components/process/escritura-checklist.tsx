"use client";

import * as React from "react";
import { AlertTriangle, CalendarClock, Check, ClipboardList, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  defaultChecklist, checklistStatus, GROUP_LABEL,
  type ChecklistItem, type ChecklistGroup,
} from "@/lib/data/escritura-checklist";

const GROUPS: ChecklistGroup[] = ["documentacao", "escritura", "recolha", "mudanca", "pos"];
const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/** Checklist assistido de escritura & mudança, com alertas e email às partes. */
export function EscrituraChecklist({ dealRef }: { dealRef: string }) {
  const [items, setItems] = React.useState<ChecklistItem[]>(() => defaultChecklist());
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const st = checklistStatus(items);

  function update(id: string, patch: Partial<ChecklistItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function notify() {
    setSending(true);
    setSent(false);
    try {
      const pending = items.filter((i) => !i.done).map((i) => `${GROUP_LABEL[i.group]}: ${i.label}${i.critical ? " (vital)" : ""}`);
      const res = await fetch("/api/deals/escritura-notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealRef, done: st.done, total: st.total, pending }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <ClipboardList className="size-5 text-primary" /> Checklist de escritura & mudança
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">{st.done}/{st.total} concluídos</span>
      </div>

      {/* Barra + alertas */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${st.total ? (st.done / st.total) * 100 : 0}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {st.criticalMissing > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
            <AlertTriangle className="size-3.5" /> {st.criticalMissing} item(ns) vital(is) por concluir
          </span>
        )}
        {st.overdue > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
            <CalendarClock className="size-3.5" /> {st.overdue} fora do prazo
          </span>
        )}
        {st.complete && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            <Check className="size-3.5" /> Tudo pronto para a escritura
          </span>
        )}
      </div>

      {/* Grupos */}
      <div className="mt-5 space-y-5">
        {GROUPS.map((g) => {
          const groupItems = items.filter((i) => i.group === g);
          if (groupItems.length === 0) return null;
          return (
            <div key={g}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[g]}</p>
              <ul className="mt-2 space-y-2">
                {groupItems.map((i) => {
                  const overdue = !i.done && i.dueAt && new Date(i.dueAt) < new Date();
                  return (
                    <li key={i.id} className="rounded-xl border p-2.5">
                      <label className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={i.done}
                          onChange={(e) => update(i.id, { done: e.target.checked })}
                          className="mt-0.5 size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={cn("text-sm", i.done && "text-muted-foreground line-through")}>
                            {i.label}
                            {i.critical && <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">vital</span>}
                            {overdue && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">fora do prazo</span>}
                          </span>
                        </span>
                        <input
                          type="date"
                          value={i.dueAt ?? ""}
                          onChange={(e) => update(i.id, { dueAt: e.target.value })}
                          className="w-[8.5rem] shrink-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                          title="Data-alvo"
                        />
                      </label>
                      {i.value !== undefined && (
                        <input
                          value={i.value}
                          onChange={(e) => update(i.id, { value: e.target.value })}
                          placeholder="Preencher…"
                          className={cn(box, "mt-2 ml-6")}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Ação: notificar as partes */}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button onClick={notify} disabled={sending}>
          <Mail className="size-4" /> {sending ? "A enviar…" : "Enviar verificação por email"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Envia o ponto de situação a cliente, consultor, coordenação e direção.
        </span>
        {sent && <span className="text-xs text-primary">✓ Verificação enviada.</span>}
      </div>
    </div>
  );
}
