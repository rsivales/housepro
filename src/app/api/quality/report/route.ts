import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { insertNotifications } from "@/lib/db/repo";
import { notifyGeneric } from "@/lib/notify";
import type { QualityCategory } from "@/lib/data/quality";

/**
 * Portal do cliente → Qualidade. O cliente reporta uma ocorrência (espera
 * demasiado longa, reclamação…). NÃO pune automaticamente: entra como
 * "pendente" na fila de análise da Qualidade, que depois decide (reparo,
 * infração ou arquivar). Rota pública — usada a partir do portal do cliente.
 *
 * POST { agentId, category, reason, submittedBy? }
 */
const CATS = new Set<QualityCategory>(["atraso", "reclamacao", "abandono", "procedimento", "etica"]);

export async function POST(request: Request) {
  let body: { agentId?: string; category?: string; reason?: string; submittedBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const agentId = String(body.agentId ?? "").trim();
  const category = (CATS.has(body.category as QualityCategory) ? body.category : "reclamacao") as QualityCategory;
  const reason = String(body.reason ?? "").trim().slice(0, 500);
  const submittedBy = body.submittedBy ? String(body.submittedBy).slice(0, 120) : "Cliente (portal)";
  if (!agentId || !reason) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("quality_events").insert({
        kind: "reparo", agent_id: agentId, category, points: 0, amount: 0,
        reason, status: "pendente", origin: "portal", submitted_by: submittedBy,
      });
    } catch {/* best-effort */}
  }

  // Avisa a coordenação (a analisar) — o cliente não gera punição direta.
  await notifyGeneric({
    subject: "HousePro — Qualidade: nova ocorrência do portal do cliente",
    text: `${submittedBy} reportou: ${reason}\nCategoria: ${category}\n\nEntrou na fila de análise da Qualidade.\n\n— HousePro`,
  });
  await insertNotifications([{
    userId: agentId, type: "qualidade",
    title: "O cliente registou uma ocorrência",
    body: "A Qualidade vai analisar. Ainda não tem efeito na tua reputação.",
    href: "/app/qualidade",
  }]);

  return NextResponse.json({ ok: true, queued: true });
}
