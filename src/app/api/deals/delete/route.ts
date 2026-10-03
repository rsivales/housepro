import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { deleteDeal } from "@/lib/db/deals";

/** Apaga um negócio — ex.: criado por engano, duplicado. Reservado a staff
 *  (coordenação/direção/admin); apaga em cascata o histórico de fases.
 *  POST { dealId } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  if (!isStaff(session.agent)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  let body: { dealId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dealId = String(body.dealId ?? "").trim();
  if (!dealId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const res = await deleteDeal(dealId);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
