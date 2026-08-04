import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listNotifications } from "@/lib/db/repo";
import { demoNotifications } from "@/lib/data/dashboard";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const real = await listNotifications(session.agent.id);
  const items = real.length ? real : demoNotifications();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Bell className="size-7 text-primary" /> Notificações
        </h1>

        <ul className="mt-6 space-y-2.5">
          {items.map((n) => {
            const inner = (
              <div className={n.read ? "opacity-70" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                  {n.amount ? ` · ${formatEuro(n.amount)}` : ""}
                </p>
              </div>
            );
            return (
              <li key={n.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                {n.href ? <Link href={n.href} className="block">{inner}</Link> : inner}
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Sem notificações.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
