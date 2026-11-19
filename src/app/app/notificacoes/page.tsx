import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listNotifications, notificationCounts } from "@/lib/db/repo";
import { demoNotifications } from "@/lib/data/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NotificationsList } from "@/components/consultant/notifications-list";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");

  // Fictícias só em modo demo (sem Supabase). Em produção, lista real mesmo
  // vazia — nunca mostrar notificações de contactos que não existem.
  const q = await searchParams;
  const page = Math.min(10000, Math.max(0, Math.floor(Number(q.page) || 1) - 1));
  const [items, counts] = isSupabaseConfigured()
    ? await Promise.all([listNotifications(session.agent.id, 30, page), notificationCounts(session.agent.id)])
    : [demoNotifications(), { unread: 0, total: 0 }];

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Bell className="size-7 text-primary" /> Notificações
        </h1>

        <Link href="/app/atualizacoes" className="mt-3 inline-block text-sm text-primary">Atualizações do sistema</Link>
        <p className="mt-3 text-sm text-muted-foreground">{counts.unread} por ler · {counts.total} notificações</p>
        <NotificationsList key={page} initial={items} />
        <nav className="mt-6 flex gap-4 text-sm text-primary">
          {page > 0 && <Link href={`?page=${page}`}>Página anterior</Link>}
          {(page + 1) * 30 < counts.total && <Link href={`?page=${page + 2}`}>Página seguinte</Link>}
        </nav>
      </div>
    </div>
  );
}
