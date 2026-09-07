import type { Metadata } from "next";

import { PublicHeader } from "@/components/home/public-header";
import { DynamicHero } from "@/components/home/dynamic-hero";
import { NeedSelector } from "@/components/home/need-selector";
import { FeaturedProperties } from "@/components/home/featured-properties";
import { HouseProGuide } from "@/components/home/housepro-guide";
import { UsefulTools } from "@/components/home/useful-tools";
import { RealStories } from "@/components/home/real-stories";
import { RecruitmentCTA } from "@/components/home/recruitment-cta";
import { TrustBadges } from "@/components/home/trust-badges";
import { FinalContactCTA } from "@/components/home/final-contact-cta";
import Link from "next/link";
import { PublicFooter } from "@/components/home/public-footer";
import { HeroSearch } from "@/components/home/hero-search";
import { activeBanners, DEFAULT_BANNERS } from "@/lib/data/banners";
import { listProperties } from "@/lib/db/repo";
import { topFeatured } from "@/lib/data/ranking";
import { getNews } from "@/lib/data/news";

export const metadata: Metadata = {
  title: "HousePro — A casa certa muda tudo.",
  description:
    "Comprar, vender ou investir em imóveis no Algarve, Lisboa e Porto — com uma equipa que conhece o mercado e escuta o que procura.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "HousePro — A casa certa muda tudo.",
    description:
      "Comprar, vender ou investir — com paixão pelo que fazemos. Algarve · Lisboa · Porto.",
    type: "website",
    locale: "pt_PT",
  },
};

/** JSON-LD (Organization + RealEstateAgent) para SEO. */
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "HousePro",
  description:
    "Mediação imobiliária — comprar, vender e investir no Algarve, Lisboa e Porto.",
  areaServed: ["Algarve", "Lisboa", "Porto"],
  url: "https://www.housepro.pt/",
  slogan: "A casa certa muda tudo.",
};

export default async function Home() {
  const banners = activeBanners(DEFAULT_BANNERS);
  const disponiveis = await listProperties();
  // Destaques: fotos reais primeiro (evita as ilustrações/placeholders).
  const isRealPhoto = (s: string) => /\.(jpe?g|png|webp|avif)$/i.test(s);
  const destaques = topFeatured(6, disponiveis).sort(
    (a, b) => Number(isRealPhoto(b.image)) - Number(isRealPhoto(a.image)),
  );
  const news = await getNews(4);

  return (
    <div id="top" className="hp min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />

      {/* 1. Cabeçalho */}
      <PublicHeader />

      <main>
        {/* 2. Banner emocional dinâmico */}
        <DynamicHero banners={banners} />

        {/* 3. Pesquisa de imóveis — sobrepõe o banner */}
        <div className="relative z-10 mx-auto -mt-14 max-w-3xl px-4 sm:-mt-16 sm:px-6">
          <HeroSearch />
        </div>

        {/* 4. Comece pelo que precisa */}
        <div className="mt-8 sm:mt-10">
          <NeedSelector />
        </div>

        {/* 5. Imóveis em destaque */}
        <div className="mt-16 sm:mt-24">
          <FeaturedProperties properties={destaques} />
        </div>

        <section className="mx-auto mt-16 max-w-7xl px-4 sm:mt-24 sm:px-6">
          <div className="overflow-hidden bg-[#0a0a0a] px-6 py-10 text-[#f3efe7] sm:px-12 sm:py-14">
            <p className="text-xs font-semibold tracking-[.22em] text-[#b99a5b]">HOUSEPRO SIGNATURE</p>
            <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">Imóveis que não se repetem.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Uma seleção privada das propriedades mais extraordinárias de Portugal.</p>
              </div>
              <Link href="/signature" className="inline-flex min-h-11 items-center justify-center border border-[#b99a5b]/70 px-5 text-sm font-semibold transition hover:bg-[#b99a5b] hover:text-black">Descobrir Signature</Link>
            </div>
          </div>
        </section>

        {/* 6. Informação que ajuda a decidir (Guia HousePro) */}
        <div className="mt-16 sm:mt-24">
          <HouseProGuide articles={news} />
        </div>

        {/* 7. Decida com mais confiança — ferramentas (Deep Navy) */}
        <div className="mt-16 sm:mt-24">
          <UsefulTools />
        </div>

        {/* 8. Histórias reais (oculta enquanto não houver histórias reais) */}
        <RealStories />

        {/* 9. Recrutamento */}
        <div className="mt-16 sm:mt-24">
          <RecruitmentCTA image="/home/equipa.webp" />
        </div>

        {/* 10. Confiança reconhecida */}
        <div className="mt-16 sm:mt-24">
          <TrustBadges />
        </div>

        {/* 11. CTA final (Deep Navy) */}
        <div className="mt-16 sm:mt-24">
          <FinalContactCTA />
        </div>
      </main>

      {/* 12. Rodapé */}
      <PublicFooter />
    </div>
  );
}
