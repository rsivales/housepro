import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { SuperadminPasswordForm } from "@/components/admin/superadmin-password-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SUPERADMIN_EMAIL } from "@/lib/auth/superadmin";
import { isSuperadmin } from "@/lib/data/roles";
import { getSession } from "@/lib/supabase/auth";

export default async function AdminSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isSuperadmin(session.agent)) redirect("/admin");

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>
        <p className="mt-6 flex items-center gap-1.5 text-sm font-medium text-primary">
          <KeyRound className="size-4" /> Super Admin · Segurança
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Segurança da conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Defina uma palavra-passe para entrar com o email da marca sem depender do link por email.
        </p>

        <SuperadminPasswordForm email={session.agent.email ?? SUPERADMIN_EMAIL} />
      </main>
    </div>
  );
}
