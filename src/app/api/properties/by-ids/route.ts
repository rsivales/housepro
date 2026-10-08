import { NextResponse } from "next/server";

import { getPropertiesByIds } from "@/lib/db/repo";

/** Vários imóveis pelo id — usado pela lista de favoritos do cliente
 *  (dados públicos, os mesmos visíveis em /imoveis). GET ?ids=a,b,c */
export async function GET(request: Request) {
  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return NextResponse.json({ properties: [] });
  const properties = await getPropertiesByIds(ids);
  return NextResponse.json({ properties });
}
