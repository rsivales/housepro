import { NextResponse } from "next/server";

/**
 * Importa dados de um imóvel a partir de um link (OpenGraph / meta tags):
 * foto, título, descrição e preço, para juntar ao dossier da Reunião Uau.
 * Funciona quando o servidor tem acesso à rede (produção/Vercel). Neste
 * ambiente, o egress externo pode estar bloqueado — o editor recorre então
 * ao preenchimento manual.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; HouseProBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const meta = (prop: string) => {
      const patterns = [
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
          "i"
        ),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[1];
      }
      return "";
    };

    const title =
      meta("og:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
    const image = meta("og:image");
    const description = meta("og:description");
    const priceRaw =
      meta("product:price:amount") || meta("og:price:amount") || "";
    const priceText =
      priceRaw || `${title} ${description}`.match(/€\s?[\d.\s]{4,}|[\d.\s]{4,}\s?€/)?.[0] || "";
    const price = Number(String(priceText).replace(/[^\d]/g, "")) || 0;

    return NextResponse.json({ title, image, description, price });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
