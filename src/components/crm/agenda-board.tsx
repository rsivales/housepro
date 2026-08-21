"use client";

import * as React from "react";
import { Plus, Loader2, CalendarClock, CheckCircle2, Circle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TASK_KIND_LABEL,
  VISIT_STATUS_LABEL,
  type Task,
  type Visit,
  type TaskKind,
  type VisitKind,
} from "@/lib/data/contacts";

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "—";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  alta: "bg-destructive",
  normal: "bg-primary",
  baixa: "bg-slate-400",
};

/**
 * Agenda do consultor: tarefas (com concluir) e visitas/eventos. Criação rápida
 * de tarefa. Escreve em /api/tasks e /api/visits (best-effort em demo).
 */
export function AgendaBoard({
  initialTasks,
  visits: initialVisits,
  openForm,
}: {
  initialTasks: Task[];
  visits: Visit[];
  /** Abrir automaticamente o formulário de tarefa ou de visita (via ?novo=). */
  openForm?: "tarefa" | "visita";
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [open, setOpen] = React.useState(openForm === "tarefa");
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<TaskKind>("followup");
  const [dueAt, setDueAt] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Visitas
  const [visits, setVisits] = React.useState<Visit[]>(initialVisits);
  const [vOpen, setVOpen] = React.useState(openForm === "visita");
  const [vName, setVName] = React.useState("");
  const [vKind, setVKind] = React.useState<VisitKind>("visita");
  const [vAt, setVAt] = React.useState("");
  const [vRef, setVRef] = React.useState("");
  const [vBusy, setVBusy] = React.useState(false);

  async function createVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!vAt) return;
    setVBusy(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: vKind, at: vAt, contactName: vName || undefined, propertyRef: vRef || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setVisits((prev) => [...prev, data.visit as Visit].sort((a, b) => a.at.localeCompare(b.at)));
        setVName(""); setVAt(""); setVRef(""); setVOpen(false);
      }
    } finally {
      setVBusy(false);
    }
  }

  async function toggle(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: t.id, done: !t.done }),
      });
    } catch {
      /* best-effort */
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, kind, dueAt: dueAt || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => [data.task as Task, ...prev]);
        setTitle("");
        setDueAt("");
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  const pending = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Tarefas */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Tarefas</h2>
          <Button size="sm" onClick={() => setOpen((v) => !v)}>
            <Plus className="size-4" /> Nova tarefa
          </Button>
        </div>

        {open && (
          <form onSubmit={create} className="mt-3 rounded-2xl border bg-card p-3 shadow-sm">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que há a fazer?"
              className="input"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} className="input w-40">
                {(Object.keys(TASK_KIND_LABEL) as TaskKind[]).map((k) => (
                  <option key={k} value={k}>{TASK_KIND_LABEL[k]}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="input flex-1"
              />
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar
              </Button>
            </div>
          </form>
        )}

        <ul className="mt-3 space-y-2">
          {pending.map((t) => (
            <li key={t.id} className="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-sm">
              <button onClick={() => toggle(t)} aria-label="Concluir" className="mt-0.5 text-muted-foreground hover:text-primary">
                <Circle className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{t.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`size-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                  {TASK_KIND_LABEL[t.kind]}
                  {t.contactName && <> · {t.contactName}</>}
                  {t.dueAt && <> · <CalendarClock className="size-3" /> {fmt(t.dueAt)}</>}
                </p>
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
              Sem tarefas pendentes. 🎉
            </li>
          )}
          {doneTasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3 rounded-2xl border bg-card/60 p-3">
              <button onClick={() => toggle(t)} aria-label="Reabrir" className="mt-0.5 text-primary">
                <CheckCircle2 className="size-5" />
              </button>
              <p className="flex-1 text-sm text-muted-foreground line-through">{t.title}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Visitas / eventos */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Próximas visitas</h2>
          <Button size="sm" onClick={() => setVOpen((v) => !v)}>
            <Plus className="size-4" /> Nova visita
          </Button>
        </div>

        {vOpen && (
          <form onSubmit={createVisit} className="mt-3 rounded-2xl border bg-card p-3 shadow-sm">
            <input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Contacto (opcional)" className="input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <select value={vKind} onChange={(e) => setVKind(e.target.value as VisitKind)} className="input w-36">
                <option value="visita">Visita</option>
                <option value="reuniao">Reunião</option>
                <option value="avaliacao">Avaliação</option>
                <option value="outro">Outro</option>
              </select>
              <input type="datetime-local" required value={vAt} onChange={(e) => setVAt(e.target.value)} className="input flex-1" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={vRef} onChange={(e) => setVRef(e.target.value)} placeholder="Imóvel (ref.)" className="input flex-1" />
              <Button type="submit" size="sm" disabled={vBusy}>
                {vBusy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agendar
              </Button>
            </div>
          </form>
        )}

        <ul className="mt-3 space-y-2">
          {visits.map((v) => (
            <li key={v.id} className="rounded-2xl border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{v.contactName ?? "Visita"}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {VISIT_STATUS_LABEL[v.status]}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="size-3" /> {fmt(v.at)}
                {v.durationMin && <> · {v.durationMin} min</>}
                {v.propertyRef && (<><span>·</span><MapPin className="size-3" /> {v.propertyRef}</>)}
              </p>
              {v.note && <p className="mt-1 text-sm text-muted-foreground">{v.note}</p>}
            </li>
          ))}
          {visits.length === 0 && (
            <li className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
              Sem visitas agendadas.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
