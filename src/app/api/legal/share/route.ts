import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { insertNotifications } from "@/lib/db/repo";
import { notifyGeneric } from "@/lib/notify";

/**
 * LegalFlow — o advogado partilha uma nova versão do documento. Notifica todas
 * as partes envolvidas (app + email best-effort) para acompanharem em tempo real.
 *
 * POST { ref, version, parties: string[] }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { ref?: string; version?: number; parties?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const ref = String(body.ref ?? "processo");
  const version = Number(body.version ?? 1);
  const parties = (body.parties ?? []).filter(Boolean);

  await insertNotifications(
    parties.map((userId) => ({
      userId,
      type: "legalflow",
      title: `${ref}: nova versão do documento (v${version})`,
      body: `${session.agent.name} partilhou a v${version}. Acompanhe no LegalFlow.`,
      href: "/app/legalflow",
    }))
  );
  await notifyGeneric({
    subject: `HousePro LegalFlow — ${ref}: documento v${version} partilhado`,
    text: `${session.agent.name} partilhou a versão ${version} do documento de ${ref}. Todas as partes podem acompanhar no LegalFlow.\n\n— HousePro`,
  });

  return NextResponse.json({ ok: true });
}
