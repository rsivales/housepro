import { NextResponse } from "next/server";
import { buildMaisValiasHtml } from "@/lib/tools/mais-valias-report-html";
import { generateMaisValiasPdf } from "@/lib/tools/mais-valias-report-pdf";

import { createLead, getAgentPublicById } from "@/lib/db/repo";
import { notifyGeneric, notifyLead } from "@/lib/notify";
import { agentEmail } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  validateSubmission, runSimulation, buildLead, buildEmailReport, dedupeKey,
  type MvSubmission,
} from "@/lib/tools/mais-valias-funnel";

/**
 * Calculadora de mais-valias → simulação (servidor), envio do relatório por
 * e-mail e criação da lead no Helix. NUNCA devolve valores ao cliente.
 */
const RATE = new Map<string, { n: number; t: number }>();
const RECENT = new Map<string, { time: number; id: string; emailStatus: string; needsAnalysis: boolean }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const DEDUPE_MS = 5 * 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = RATE.get(ip);
  if (!cur || now - cur.t > WINDOW_MS) { RATE.set(ip, { n: 1, t: now }); return false; }
  cur.n += 1;
  return cur.n > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let s: MvSubmission;
  try {
    s = (await request.json()) as MvSubmission;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot
  if ((s as unknown as { website?: string }).website) return NextResponse.json({ ok: true, id: "ignored" });

  const errors = validateSubmission(s);
  if (Object.keys(errors).length > 0) return NextResponse.json({ error: "validation", fields: errors }, { status: 422 });

  // Dedup curto-prazo (pedido de reenvio controlado)
  const key = dedupeKey(s);
  const now = Date.now();
  const last = RECENT.get(key);
  if (last && now - last.time < DEDUPE_MS) return NextResponse.json({ ok: true, id: last.id, emailStatus: last.emailStatus, needsAnalysis: last.needsAnalysis, duplicate: true });

  // Simulação (servidor) — os valores NUNCA são devolvidos ao cliente.
  const result = runSimulation(s);

  // Save the complete report BEFORE attempting delivery. The consultant can
  // answer even when the email provider is unavailable.
  const report = buildEmailReport(s, result);
  const newLead = buildLead(s, result, "pendente");
  if (s.ref) { newLead.ownerId = s.ref; newLead.assignedAgentId = s.ref; }
  // Keep CRM message concise; do not dump the entire report into the lead.
  let lead;
  try {
    lead = await createLead(newLead);
  } catch {
    return NextResponse.json({ error: "persist_failed", retry: true }, { status: 503 });
  }
  // Persist a private snapshot so the consultant can regenerate/send the same PDF.
  if (isSupabaseConfigured()) {
    const { error: snapshotError } = await createAdminClient().from("mais_valias_reports").upsert({ lead_id: lead.id, submission: s, calculation: result }, { onConflict: "lead_id" });
    if (snapshotError) console.error("[mais-valias] report snapshot failed", snapshotError.code);
  }
  let emailChannels: string[] = [];
  try {
    emailChannels = await notifyGeneric({ subject: report.subject, text: report.text, html: buildMaisValiasHtml(s, result), attachments: [{ filename: "HousePro-Mais-Valias.pdf", content: Buffer.from(generateMaisValiasPdf(s, result)).toString("base64") }], to: [s.email] });
  } catch { /* saved for manual follow-up */ }
  const emailStatus = emailChannels.includes("email") ? "enviado" : "pendente";
  if (isSupabaseConfigured()) {
    await createAdminClient().from("leads").update({ email_status: emailStatus }).eq("id", lead.id);
  }
  for (const [cacheKey, cached] of RECENT) if (now - cached.time >= DEDUPE_MS) RECENT.delete(cacheKey);
  RECENT.set(key, { time: now, id: lead.id, emailStatus, needsAnalysis: result.needsAnalysis });

  // Notifica o consultor atribuído (best-effort).
  const owner = lead.ownerId ? await getAgentPublicById(lead.ownerId) : undefined;
  try {
    await notifyLead(lead, { agentName: owner?.name, agentEmail: owner ? agentEmail(owner) : undefined, channel: "Calculadora mais-valias" });
  } catch { /* best-effort */ }

  // Só estado — nunca valores.
  return NextResponse.json({ ok: true, id: lead.id, emailStatus, needsAnalysis: result.needsAnalysis });
}
