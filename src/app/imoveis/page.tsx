import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicHeader } from "@/components/home/public-header";
import { PublicFooter } from "@/components/home/public-footer";
import { PropertyDiscovery } from "@/components/property/property-discovery";
import { getPropertyHubConfig, listProperties } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "Imóveis para comprar e arrendar | HousePro",
  description: "Encontre imóveis HousePro para comprar ou arrendar. Pesquise por localização, tipologia, preço, características, Signature e empreendimentos.",
  alternates: { canonical: "/imoveis" },
  openGraph: { title: "Encontre a casa certa | HousePro", description: "Explore imóveis publicados e disponíveis da HousePro.", type: "website", locale: "pt_PT" },
};

export default async function ImoveisPage() {
  const [properties, config] = await Promise.all([listProperties(), getPropertyHubConfig()]);
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: config.title, url: "https://www.housepro.pt/imoveis", numberOfItems: properties.length };
  return <div className="min-h-dvh bg-[#f4f7fb] text-[#0b2540]"><PublicHeader solid /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl animate-pulse px-4 py-10"><div className="h-12 w-80 rounded-xl bg-slate-200"/><div className="mt-6 h-96 rounded-2xl bg-slate-200"/></div>}><PropertyDiscovery properties={properties} config={config} /></Suspense><PublicFooter /></div>;
}
