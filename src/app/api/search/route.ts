import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import {
  listContactsByOwner,
  listMetaLeadsByAgent,
  listProperties,
  listCampaigns,
} from "@/lib/db/repo";
import { universalSearch } from "@/lib/data/search";

/**
 * Pesquisa universal — transversal a contactos, leads, imóveis e campanhas.
 * O âmbito respeita o utilizador (contactos/leads próprios; imóveis e campanhas
 * da rede).
 *  GET ?q=texto
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ hits: [] });

  const [contacts, leads, properties, campaigns] = await Promise.all([
    listContactsByOwner(session.agent.id),
    listMetaLeadsByAgent(session.agent.id),
    listProperties(),
    listCampaigns(),
  ]);

  const hits = universalSearch(q, { contacts, leads, properties, campaigns }).slice(0, 30);
  return NextResponse.json({ hits });
}
