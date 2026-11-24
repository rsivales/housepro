import { NextResponse } from "next/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import {
  equalSecret,
  transactionAlertsWorkerSecret,
  runTransactionAlertsWorker,
} from "@/lib/helix/transaction-alerts-worker";

/** Escalada diária de prazos pré-escritura (ver docs/helix/MANUAL_TECNICO_BRAND.md).
 *  Chamado pelo pg_cron "helix-transaction-deadlines" com o segredo próprio
 *  (helix_private.transaction_alerts_worker) — nunca por um cliente. */
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasServiceRole())
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token)
    return NextResponse.json({ error: "Acesso reservado." }, { status: 401 });
  try {
    if (!equalSecret(token, await transactionAlertsWorkerSecret()))
      return NextResponse.json({ error: "Acesso reservado." }, { status: 401 });
    return NextResponse.json(await runTransactionAlertsWorker());
  } catch {
    return NextResponse.json(
      { error: "Não foi possível executar a escalada de prazos." },
      { status: 503 },
    );
  }
}
