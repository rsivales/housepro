import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { SuperadminPasswordForm } from "@/components/admin/superadmin-password-form";
import { Logo } from "@/components/brand/logo";
import { getSession } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Nova palavra-passe · HousePro" };

/**
 * Destino do link de recuperação de palavra-passe (ver /entrar → "Esqueci a
 * palavra-passe" → resetPasswordForEmail → /auth/callback → aqui). Exige
 * sessão válida (a que o próprio link de recuperação estabelece); sem isso
 * volta à entrada com o aviso de link expirado/inválido.
 */
export default async function NovaPasswordPage() {
  const session = await getSession();
  if (!session || session.demo) redirect("/entrar?erro=link");

  return (
    <div className="hp min-h-dvh bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link href="/" aria-label="HousePro — início">
          <Logo className="h-8" />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-4 pb-20 sm:px-6">
        <Link href="/entrar" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Entrada
        </Link>
        <p className="hp-eyebrow mt-6 flex items-center gap-1.5">
          <KeyRound className="size-4" /> Recuperação de acesso
        </p>
        <h1 className="mt-1 font-display text-3xl">Nova palavra-passe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Defina a nova palavra-passe da sua conta HousePro.
        </p>

        <SuperadminPasswordForm email={session.agent.email ?? ""} />
      </main>
    </div>
  );
}
