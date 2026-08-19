import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Quote } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getQuotesConfig } from "@/lib/db/repo";
import { can } from "@/lib/data/permissions";
import { QuotesAdmin } from "@/components/admin/quotes-admin";

export const metadata: Metadata = { title: "Frases diárias — administração" };

export default async function FrasesAdminPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const isAdmin =
    session.demo ||
    session.agent.roleKey === "admin" ||
    session.agent.roleKey === "superadmin" ||
    session.agent.role === "admin" ||
    can(session.agent.roleKey, "manage_permissions");
  if (!isAdmin) redirect("/app");

  const extra = await getQuotesConfig();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Administração
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Quote className="size-7 text-primary" /> Frases diárias
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A frase do dia é determinística (igual para todos, muda todos os dias).
          As datas especiais e campanhas têm prioridade.
        </p>

        <div className="mt-6">
          <QuotesAdmin initial={extra} />
        </div>
      </div>
    </div>
  );
}
