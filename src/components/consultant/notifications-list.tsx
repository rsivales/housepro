"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCheck } from "lucide-react";

import { formatEuro } from "@/lib/format";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  amount?: number;
  href?: string;
  read: boolean;
  createdAt: string;
}

/** Lista de notificações com ação de marcar como lida — a interatividade (o
 *  servidor em si é só leitura) vive aqui. Marcar como lida não apaga: passa
 *  para "Histórico", tal como as alterações aos imóveis ficam registadas em
 *  vez de desaparecerem. */
export function NotificationsList({ initial }: { initial: NotificationItem[] }) {
  const [items, setItems] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | "all" | null>(null);

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  async function markRead(ids?: string[]) {
    setBusy(ids ? ids[0] : "all");
    setItems((cur) => cur.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    } catch {
      /* otimista — se falhar, a próxima visita à página volta a mostrar como não lida */
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {unread.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {unread.length} por ler
          </p>
          <button
            type="button"
            onClick={() => markRead()}
            disabled={busy === "all"}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            <CheckCheck className="size-4" /> Marcar todas como lidas
          </button>
        </div>
      )}

      <ul className="mt-3 space-y-2.5">
        {unread.map((n) => (
          <NotificationCard key={n.id} n={n} busy={busy === n.id} onMarkRead={() => markRead([n.id])} />
        ))}
        {unread.length === 0 && read.length === 0 && (
          <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sem notificações.
          </li>
        )}
      </ul>

      {read.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-muted-foreground">Histórico</h2>
          <ul className="mt-3 space-y-2.5">
            {read.map((n) => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function NotificationCard({
  n,
  busy,
  onMarkRead,
}: {
  n: NotificationItem;
  busy?: boolean;
  onMarkRead?: () => void;
}) {
  const body = (
    <div className={n.read ? "opacity-70" : ""}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{n.title}</p>
        {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
      </div>
      {n.body && <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(n.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
        {n.amount ? ` · ${formatEuro(n.amount)}` : ""}
      </p>
    </div>
  );

  return (
    <li className="flex items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        {n.href ? (
          <Link href={n.href} className="block">
            {body}
            <span className="mt-3 block text-sm font-semibold text-primary">{n.href === "/app/leads" ? "Ver pedidos e contactos registados →" : "Abrir detalhe →"}</span>
          </Link>
        ) : (
          body
        )}
      </div>
      {!n.read && onMarkRead && (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={busy}
          aria-label="Marcar como lida"
          title="Marcar como lida"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Check className="size-3.5" />
        </button>
      )}
    </li>
  );
}
