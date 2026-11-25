import { NextResponse } from "next/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import { equalSecret, institutionalSendsWorkerSecret, runInstitutionalSendsWorker } from "@/lib/institutional/worker";

/** Envios institucionais sazonais (Natal, Páscoa, feriados emblemáticos) e de
 *  aniversário. Chamado pelo pg_cron "helix-institutional-sends" com o
 *  segredo próprio (helix_private.institutional_sends_worker) — nunca por
 *  um cliente. */
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
    if (!equalSecret(token, await institutionalSendsWorkerSecret()))
      return NextResponse.json({ error: "Acesso reservado." }, { status: 401 });
    return NextResponse.json(await runInstitutionalSendsWorker());
  } catch {
    return NextResponse.json({ error: "Não foi possível executar os envios institucionais." }, { status: 503 });
  }
}
