"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Clock, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DealTask, TaskStatus } from "@/lib/db/deal-tasks";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Por enviar",
  requested: "Pedido pela equipa",
  received: "Recebido — em validação",
  in_review: "Em validação",
  validated: "Validado",
  rejected: "Por favor reenvie",
  waived: "Não é necessário",
};
const STATUS_CLASS: Record<TaskStatus, string> = {
  pending: "bg-secondary text-muted-foreground",
  requested: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  received: "bg-secondary text-muted-foreground",
  in_review: "bg-secondary text-muted-foreground",
  validated: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  waived: "bg-secondary text-muted-foreground",
};
const UPLOADABLE: TaskStatus[] = ["pending", "requested", "rejected"];

/** Lista de documentos pedidos ao comprador/vendedor — acompanha e carrega,
 *  nunca marca como validado (isso cabe sempre a um profissional). */
export function ClientTaskList({ tasks }: { tasks: DealTask[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [errId, setErrId] = React.useState<Record<string, string>>({});

  async function upload(task: DealTask, file: File) {
    setBusyId(task.id);
    setErrId((e) => ({ ...e, [task.id]: "" }));
    try {
      const form = new FormData();
      form.set("document", file);
      const res = await fetch(`/api/cliente/deal-tasks/${task.id}/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrId((e) => ({ ...e, [task.id]: j.error ?? "Não foi possível enviar o documento." }));
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) return null;

  return (
    <ul className="mt-4 space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs">
              {t.status === "validated" ? <Check className="size-3.5" /> : t.status === "rejected" ? <AlertCircle className="size-3.5" /> : <Clock className="size-3.5" />}
              <span className={cn("rounded-full px-2 py-0.5", STATUS_CLASS[t.status])}>{STATUS_LABEL[t.status]}</span>
            </p>
            {errId[t.id] && <p className="mt-1 text-xs text-destructive">{errId[t.id]}</p>}
          </div>
          {UPLOADABLE.includes(t.status) && (
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              {busyId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Carregar documento
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={busyId === t.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) upload(t, file);
                }}
              />
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}
