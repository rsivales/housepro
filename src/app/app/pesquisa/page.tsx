import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { UniversalSearch } from "@/components/crm/universal-search";

export const metadata: Metadata = { title: "Pesquisa" };

export default async function PesquisaPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Search className="size-7 text-primary" /> Pesquisa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo num só sítio — contactos, leads, imóveis e campanhas.
        </p>

        <div className="mt-6">
          <UniversalSearch />
        </div>
      </div>
    </div>
  );
}
