import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { ConsultoresManager } from "@/components/admin/consultores-manager";

export const metadata: Metadata = { title: "Consultores · Back office" };

export default function AdminConsultoresPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Users className="size-7 text-primary" /> Consultores
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cria, edita, suspende ou remove consultores. Ao criar um consultor é
          gerada uma palavra-passe temporária para partilhares com ele — deve
          alterá-la no primeiro acesso.
        </p>

        <ConsultoresManager />
      </main>
    </div>
  );
}
