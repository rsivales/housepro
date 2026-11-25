"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, ClipboardList, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  deadlineUrgency,
  remainingTime,
  type DeadlineUrgency,
} from "@/lib/helix/transaction-indicators";
import type { DealTask, TaskPhase, TaskStatus } from "@/lib/db/deal-tasks";

const PHASE_LABEL: Record<TaskPhase, string> = {
  pre_cpcv: "Documentação (antes do CPCV)",
  credito: "Crédito bancário",
  post_cpcv: "Entre CPCV e escritura",
  pre_escritura: "Controlo pré-escritura",
  post_escritura: "Pós-escritura",
};
const PHASE_ORDER: TaskPhase[] = [
  "pre_cpcv",
  "credito",
  "post_cpcv",
  "pre_escritura",
  "post_escritura",
];
const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Por iniciar",
  requested: "Pedido ao cliente",
  received: "Recebido",
  in_review: "Em validação",
  validated: "Validado",
  rejected: "Rejeitado",
  waived: "Dispensado",
};
const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[];

const URGENCY_LABEL: Record<DeadlineUrgency, string> = {
  sem_prazo: "sem prazo",
  normal: "normal",
  atencao: "atenção",
  urgente: "urgente",
  critico: "crítico",
  vencido: "vencido",
  concluido: "concluído",
};
const URGENCY_CLASS: Record<DeadlineUrgency, string> = {
  sem_prazo: "bg-secondary text-muted-foreground",
  normal: "bg-secondary text-muted-foreground",
  atencao: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgente: "bg-amber-500/25 text-amber-800 dark:text-amber-200",
  critico: "bg-destructive/15 text-destructive",
  vencido: "bg-destructive/20 text-destructive",
  concluido: "bg-primary/10 text-primary",
};

export function TransactionChecklist({
  dealId,
  initialTasks,
  escrituraAt,
  canManage,
}: {
  dealId: string;
  initialTasks: DealTask[];
  escrituraAt: string | null;
  /** Staff/equipa com permissão de alterar estados — clientes ficam de fora
   *  nesta fase (comprador/vendedor terão a sua própria vista no portal). */
  canManage: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState(initialTasks);
  const [seeding, setSeeding] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const outstanding = tasks.filter(
    (t) => t.applicability !== "not_applicable" && !["validated", "waived"].includes(t.status),
  );
  const criticalOutstanding = outstanding.filter((t) => t.critical).length;
  const urgency = deadlineUrgency(escrituraAt, criticalOutstanding, outstanding.length, tasks.length > 0 && outstanding.length === 0);
  const remaining = remainingTime(escrituraAt);

  async function seed() {
    setSeeding(true);
    setErr(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks`, { method: "POST" });
      if (!res.ok) {
        setErr("Não foi possível aplicar a checklist padrão.");
        return;
      }
      const data = await res.json();
      setTasks(data.tasks ?? []);
      router.refresh();
    } finally {
      setSeeding(false);
    }
  }

  async function changeStatus(task: DealTask, status: TaskStatus) {
    let waiverReason: string | undefined;
    if (status === "waived") {
      waiverReason = window.prompt("Motivo da dispensa (obrigatório):") ?? "";
      if (!waiverReason.trim()) return;
    }
    setBusyId(task.id);
    setErr(null);
    try {
      const res = await fetch(`/api/deals/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, waiverReason }),
      });
      if (!res.ok) {
        setErr("Não foi possível atualizar a tarefa.");
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status,
                waiverReason: waiverReason ?? t.waiverReason,
                validatedAt: status === "validated" ? new Date().toISOString() : t.validatedAt,
              }
            : t,
        ),
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <ClipboardList className="size-5 text-primary" /> Checklist pré-escritura
        </h2>
        <div className="flex items-center gap-2">
          {remaining && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {remaining.expired ? "prazo vencido" : `${remaining.days}d ${remaining.remainderHours}h`}
            </span>
          )}
          <span className={cn("rounded-full px-2 py-1 text-xs font-medium", URGENCY_CLASS[urgency])}>
            {URGENCY_LABEL[urgency]}
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Este negócio ainda não tem checklist. Aplique a checklist padrão para começar o controlo pré-escritura.
          </p>
          {canManage && (
            <Button onClick={seed} disabled={seeding} size="sm">
              {seeding ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
              Aplicar checklist padrão
            </Button>
          )}
        </div>
      ) : (
        <>
          {criticalOutstanding > 0 && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5" /> {criticalOutstanding} tarefa(s) vital(is) por validar
            </p>
          )}
          {outstanding.length === 0 && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Check className="size-3.5" /> Pronto para escritura
            </p>
          )}
          <div className="mt-4 space-y-5">
            {PHASE_ORDER.map((phase) => {
              const items = tasks.filter((t) => t.phase === phase);
              if (items.length === 0) return null;
              return (
                <div key={phase}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {PHASE_LABEL[phase]}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((t) => (
                      <li id={`tarefa-${t.id}`} key={t.id} className="flex scroll-mt-28 flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 target:border-primary target:bg-primary/5">
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm", (t.status === "validated" || t.status === "waived") && "text-muted-foreground line-through")}>
                            {t.title}
                            {t.critical && (
                              <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">vital</span>
                            )}
                            {t.applicability === "not_applicable" && (
                              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">n/a</span>
                            )}
                          </p>
                          {t.audience !== "internal" && (
                            <p className="text-xs text-muted-foreground">
                              {t.audience === "buyer" ? "Comprador" : "Vendedor"} — acompanha, não valida
                            </p>
                          )}
                        </div>
                        {canManage ? (
                          <select
                            value={t.status}
                            disabled={busyId === t.id}
                            onChange={(e) => changeStatus(t, e.target.value as TaskStatus)}
                            className="h-8 shrink-0 rounded-md border border-input bg-transparent px-2 text-xs"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs">{STATUS_LABEL[t.status]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </div>
  );
}
