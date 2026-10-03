import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { commissionLabel } from "@/lib/data/commission";

/**
 * Pesquisa rápida de imóveis para ligar um negócio (CRM) — por referência,
 * título ou localidade. Usada pelo seletor "Novo negócio": o consultor
 * escreve e escolhe da lista, em vez de ter de saber a referência exata de
 * cor. A ligação ao negócio é sempre feita pelo id devolvido aqui.
 *
 * GET ?q=<texto>
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ properties: [] });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ properties: [] });

  const sb = await createClient();
  const { data } = await sb
    .from("properties")
    .select("id, reference, title, municipality, price, owner_name, commission_type, commission_pct, commission_fixed")
    .or(`reference.ilike.%${q}%,title.ilike.%${q}%,municipality.ilike.%${q}%`)
    .order("listed_at", { ascending: false })
    .limit(8);

  const properties = (data ?? []).map((p) => ({
    id: String(p.id),
    reference: String(p.reference ?? ""),
    title: String(p.title ?? ""),
    municipality: String(p.municipality ?? ""),
    price: Number(p.price ?? 0),
    sellerName: (p.owner_name as string) ?? "",
    commissionPreview: commissionLabel(Number(p.price ?? 0), {
      commissionType: p.commission_type as "percent" | "fixed" | undefined,
      commissionPct: p.commission_pct != null ? Number(p.commission_pct) : undefined,
      commissionFixed: p.commission_fixed != null ? Number(p.commission_fixed) : undefined,
    }),
  }));
  return NextResponse.json({ properties });
}
