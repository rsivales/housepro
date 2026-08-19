import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listContactsByOwner } from "@/lib/db/repo";
import { ContactsManager } from "@/components/crm/contacts-manager";

export const metadata: Metadata = { title: "Contactos" };

export default async function ContactosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const contacts = await listContactsByOwner(session.agent.id);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Users className="size-7 text-primary" /> Contactos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A ficha central de cada pessoa, com a cronologia de tudo o que acontece.
          {session.demo && " Dados de exemplo."}
        </p>

        <div className="mt-6">
          <ContactsManager initial={contacts} />
        </div>
      </div>
    </div>
  );
}
