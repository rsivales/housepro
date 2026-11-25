"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TransactionManagerPanel({
  dealId,
  escrituraAt,
  cpcvDeadlineAt,
  transactionManagerId,
  candidates,
}: {
  dealId: string;
  escrituraAt: string | null;
  cpcvDeadlineAt: string | null;
  transactionManagerId: string | null;
  candidates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [escritura, setEscritura] = React.useState(toLocalInput(escrituraAt));
  const [cpcvDeadline, setCpcvDeadline] = React.useState(toLocalInput(cpcvDeadlineAt));
  const [tm, setTm] = React.useState(transactionManagerId ?? "");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/deals/${dealId}/transaction-manager`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          escrituraAt: escritura ? new Date(escritura).toISOString() : null,
          cpcvDeadlineAt: cpcvDeadline ? new Date(cpcvDeadline).toISOString() : null,
          transactionManagerId: tm || null,
        }),
      });
      if (!res.ok) {
        setErr("Não foi possível guardar a gestão processual.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg">
        <UserCog className="size-5 text-primary" /> Gestão processual
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Escritura marcada para
          <input
            type="datetime-local"
            value={escritura}
            onChange={(e) => setEscritura(e.target.value)}
            className="mt-1 block h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Prazo-limite do CPCV
          <input
            type="datetime-local"
            value={cpcvDeadline}
            onChange={(e) => setCpcvDeadline(e.target.value)}
            className="mt-1 block h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">
          Gestora/gestor processual
          <select
            value={tm}
            onChange={(e) => setTm(e.target.value)}
            className="mt-1 block h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Não atribuído</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={busy} size="sm">
          {busy && <Loader2 className="size-4 animate-spin" />} Guardar
        </Button>
        {saved && <span className="text-xs text-primary">✓ Guardado.</span>}
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </div>
  );
}
