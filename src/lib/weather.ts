/**
 * Temperatura atual para o banner do consultor — Open-Meteo (gratuito, sem
 * chave de API). Geocodifica o nome da região/cidade da agência e devolve a
 * temperatura em graus Celsius arredondados. Falha em silêncio (undefined):
 * o banner simplesmente omite a temperatura se não conseguir obtê-la.
 */
export async function getCurrentTemperature(locationName?: string | null): Promise<string | undefined> {
  const q = (locationName ?? "").trim();
  if (!q) return undefined;
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`,
      { next: { revalidate: 86400 } }
    );
    if (!geoRes.ok) return undefined;
    const geo = (await geoRes.json()) as { results?: { latitude: number; longitude: number }[] };
    const loc = geo.results?.[0];
    if (!loc) return undefined;

    const fxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m`,
      { next: { revalidate: 1800 } }
    );
    if (!fxRes.ok) return undefined;
    const fx = (await fxRes.json()) as { current?: { temperature_2m?: number } };
    const t = fx.current?.temperature_2m;
    if (t == null || !Number.isFinite(t)) return undefined;
    return `${Math.round(t)}°`;
  } catch {
    return undefined;
  }
}
