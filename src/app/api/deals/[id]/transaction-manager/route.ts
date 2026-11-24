import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { getDealGate } from "@/lib/db/deals";
import { setDealDeadlines, setTransactionManager } from "@/lib/db/deal-tasks";

/** Atribui a gestora processual e/ou define os prazos de CPCV/escritura.
 *  Só staff (coordenação e acima) — não é uma edição comercial do negócio. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  if (!isStaff(session.agent))
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  const { id: dealId } = await params;
  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const role = session.agent.roleKey ?? session.agent.role;
  if (!["superadmin", "admin"].includes(role ?? "") && session.agent.agencyId !== gate.agencyId)
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  let body: {
    transactionManagerId?: string | null;
    escrituraAt?: string | null;
    cpcvDeadlineAt?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if ("transactionManagerId" in body) {
    const res = await setTransactionManager(
      dealId,
      body.transactionManagerId || null,
    );
    if ("error" in res) return NextResponse.json(res, { status: 400 });
  }
  if ("escrituraAt" in body || "cpcvDeadlineAt" in body) {
    const res = await setDealDeadlines(dealId, {
      escrituraAt: body.escrituraAt,
      cpcvDeadlineAt: body.cpcvDeadlineAt,
    });
    if ("error" in res) return NextResponse.json(res, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
