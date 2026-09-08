import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DevelopmentsLanding } from "@/components/projects/developments-landing";
import { listDevelopments } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "Empreendimentos novos",
  description:
    "Obra nova e empreendimentos em pré-venda selecionados pela HousePro — apartamentos e moradias novas com acompanhamento dedicado.",
};

export default async function EmpreendimentosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const list = (await listDevelopments()).filter((p) =>
    !query || `${p.developmentName ?? ""} ${p.title} ${p.parish} ${p.municipality}`.toLowerCase().includes(query)
  );

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main><DevelopmentsLanding units={list} /></main>
      <SiteFooter />
    </div>
  );
}
