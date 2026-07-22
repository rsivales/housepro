import { availableProperties } from "@/lib/data/mock";
import { propertiesToFeedXML } from "@/lib/imovel/feed";

/**
 * Feed XML dos imóveis disponíveis, compatível com Idealista / Imovirtual.
 * O portal consome este endpoint periodicamente (ex.: GET diário) e publica.
 * Em produção lê do Supabase; aqui, dos dados de exemplo.
 *
 * GET /api/idealista-feed        → todos os imóveis disponíveis
 * GET /api/idealista-feed?ref=X  → apenas a referência X (útil para testar)
 */
export function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  const list = ref
    ? availableProperties.filter((p) => p.reference === ref)
    : availableProperties;

  const xml = propertiesToFeedXML(list);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Cache no CDN: revalida de hora a hora (os portais fazem polling).
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
