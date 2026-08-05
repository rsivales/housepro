import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { listProperties } from "@/lib/db/repo";
import { getConcelhosConfig } from "@/lib/db/repo";
import { topConcelhos } from "@/lib/data/concelhos";
import { ConcelhosAdmin } from "@/components/admin/concelhos-admin";

export const metadata: Metadata = { title: "Concelhos em destaque · Back office" };

export default async function AdminConcelhosPage() {
  const all = await listProperties();
  const config = await getConcelhosConfig();
  // Candidatos: os concelhos com mais procura (mais do que os destacados).
  const candidates = topConcelhos(all, 12).map((c) => ({
    name: c.name,
    district: c.district ?? "",
    count: c.count,
    autoImage: c.image, // capa real do concelho (recurso automático)
  }));

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>

        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <TrendingUp className="size-7 text-primary" /> Concelhos em destaque
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Controla a secção <strong>&ldquo;Concelhos mais procurados&rdquo;</strong> da página
          principal: mostra ou oculta, escolhe quantos destacar e atribui uma foto a cada
          concelho. Sem foto carregada, usa-se a capa de um imóvel real da zona.
        </p>

        <ConcelhosAdmin candidates={candidates} initial={config} />
      </main>
    </div>
  );
}
