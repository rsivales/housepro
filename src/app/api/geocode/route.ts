import { NextResponse } from "next/server";

/**
 * Geocodificação de morada → coordenadas (lat/lng), usada ao carregar um
 * imóvel para o marcador do mapa ser automático. Usa o Nominatim do
 * OpenStreetMap (gratuito, sem chave). Requer rede no servidor (produção).
 *
 * GET /api/geocode?q=Olhos de Água, Albufeira
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&q=" +
    encodeURIComponent(q);

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim exige um User-Agent identificável.
        "user-agent": "HousePro/1.0 (https://www.housepro.pt)",
        "accept-language": "pt",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
    }
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) {
      return NextResponse.json({ found: false });
    }
    const { lat, lon, display_name } = data[0];
    return NextResponse.json({
      found: true,
      lat: Number(lat),
      lng: Number(lon),
      display: display_name,
    });
  } catch {
    return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
  }
}
