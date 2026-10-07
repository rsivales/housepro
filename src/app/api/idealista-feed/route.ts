import { listProperties } from "@/lib/db/repo";
import { propertiesToFeedXML } from "@/lib/imovel/feed";

/**
 * XML genérico legado dos imóveis disponíveis. Não é o feed JSON V6 do idealista.
 * O portal consome este endpoint periodicamente (ex.: GET diário) e publica.
 * Lê sempre do Supabase quando configurado (produção); só cai nos dados de
 * exemplo em desenvolvimento local sem base de dados ligada.
 *
 * GET /api/idealista-feed        → todos os imóveis disponíveis
 * GET /api/idealista-feed?ref=X  → apenas a referência X (útil para testar)
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  const properties = await listProperties();
  const list = ref
    ? properties.filter((p) => p.reference === ref)
    : properties;

  const xml = propertiesToFeedXML(list);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Cache no CDN: revalida de hora a hora (os portais fazem polling).
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
