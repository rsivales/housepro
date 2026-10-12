import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listNotifications } from "@/lib/db/repo";
import { demoNotifications } from "@/lib/data/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NotificationsList } from "@/components/consultant/notifications-list";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  // Fictícias só em modo demo (sem Supabase). Em produção, lista real mesmo
  // vazia — nunca mostrar notificações de contactos que não existem.
  const items = isSupabaseConfigured() ? await listNotifications(session.agent.id, 100) : demoNotifications();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Bell className="size-7 text-primary" /> Notificações
        </h1>

        <NotificationsList initial={items} />
      </div>
    </div>
  );
}
