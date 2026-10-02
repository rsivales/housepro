import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { createDeal } from "@/lib/db/deals";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** Cria um negócio (processo) ligado a um imóvel. POST { propertyId, buyerName,
 *  sellerName, amount } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { propertyId?: string; reference?: string; buyerName?: string; sellerName?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  let propertyId = String(body.propertyId ?? "").trim();
  // Sem id? resolve pela referência (ex.: HP-1049).
  if (!propertyId && body.reference && hasServiceRole()) {
    const sb = createAdminClient();
    const { data } = await sb
      .from("properties")
      .select("id")
      .eq("reference", String(body.reference).trim())
      .maybeSingle();
    if (data?.id) propertyId = String(data.id);
  }
  if (!propertyId) return NextResponse.json({ error: "property_missing" }, { status: 400 });

  const property = await getPropertyById(propertyId);
  if (!property) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const a = session.agent;
  const allowed = property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id) || isStaff(a);
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const agencyId = property.agent?.agencyId || a.agencyId;
  if (!agencyId) return NextResponse.json({ error: "agency_unknown" }, { status: 400 });

  const res = await createDeal({
    propertyId,
    agencyId,
    angariadorId: property.agentId,
    buyerName: body.buyerName ? String(body.buyerName) : undefined,
    sellerName: body.sellerName ? String(body.sellerName) : undefined,
    amount: body.amount != null ? Number(body.amount) : undefined,
  });
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true, id: res.id });
}
