import { NextResponse } from "next/server";

import { createLead } from "@/lib/db/repo";
import { notifyGeneric, notifyLead } from "@/lib/notify";
import { agentById } from "@/lib/data/mock";
import { agentEmail } from "@/lib/format";
import {
  validateSubmission, runSimulation, buildLead, buildEmailReport, dedupeKey,
  type MvSubmission,
} from "@/lib/tools/mais-valias-funnel";

/**
 * Calculadora de mais-valias → simulação (servidor), envio do relatório por
 * e-mail e criação da lead no Helix. NUNCA devolve valores ao cliente.
 */
const RATE = new Map<string, { n: number; t: number }>();
const RECENT = new Map<string, number>();
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
  if (last && now - last < DEDUPE_MS) return NextResponse.json({ ok: true, duplicate: true });

  // Simulação (servidor) — os valores NUNCA são devolvidos ao cliente.
  const result = runSimulation(s);

  // Envio do relatório por e-mail (Resend, se configurado). Best-effort.
  const report = buildEmailReport(s, result);
  let emailChannels: string[] = [];
  try {
    emailChannels = await notifyGeneric({ subject: report.subject, text: report.text, to: [s.email] });
  } catch {
    /* best-effort */
  }
  const emailStatus = emailChannels.includes("email") ? "enviado" : "pendente";

  // Lead no Helix (sem valores financeiros; guarda estado do envio).
  const newLead = buildLead(s, result, emailStatus);
  let lead;
  try {
    lead = await createLead(newLead);
  } catch {
    return NextResponse.json({ error: "persist_failed", retry: true }, { status: 503 });
  }
  RECENT.set(key, now);

  // Notifica o consultor atribuído (best-effort).
  const owner = newLead.assignedAgentId ? agentById(newLead.assignedAgentId) : undefined;
  try {
    await notifyLead(lead, { agentName: owner?.name, agentEmail: owner ? agentEmail(owner) : undefined, channel: "Calculadora mais-valias" });
  } catch { /* best-effort */ }

  // Só estado — nunca valores.
  return NextResponse.json({ ok: true, id: lead.id, emailStatus, needsAnalysis: result.needsAnalysis });
}
