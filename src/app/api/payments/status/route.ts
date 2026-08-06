import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isStaff } from "@/lib/data/roles";

/**
 * Avança o estado de uma linha de pagamento (pendente → processado → pago).
 * Só coordenação/direção/admin/super admin. Best-effort no Supabase.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!isStaff(session.agent)) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "");
  if (!id || !["pendente", "processado", "pago"].includes(status)) {
    return NextResponse.json({ error: "dados_invalidos" }, { status: 400 });
  }

  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      await supabase.from("payouts").update({
        status,
        paid_at: status === "pago" ? new Date().toISOString() : null,
      }).eq("id", id);
    } catch {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, status });
}
