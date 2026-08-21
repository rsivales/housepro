import { NextResponse } from "next/server";

import { createLead } from "@/lib/db/repo";
import { notifyLead } from "@/lib/notify";
import { agentById } from "@/lib/data/mock";
import { agentEmail } from "@/lib/format";
import {
  buildLead,
  dedupeKey,
  validateSubmission,
  type ValuationSubmission,
} from "@/lib/valuation";

/**
 * Receção do pedido de avaliação de imóvel (funil público) → lead no Helix.
 * Validação server-side, rate limiting simples, deduplicação e notificação
 * best-effort. Não regista dados pessoais em logs.
 */

// Estado em memória (por instância) — anti-spam e dedup de curto prazo.
const RATE = new Map<string, { n: number; t: number }>();
const RECENT = new Map<string, number>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const DEDUPE_MS = 10 * 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = RATE.get(ip);
  if (!cur || now - cur.t > WINDOW_MS) {
    RATE.set(ip, { n: 1, t: now });
    return false;
  }
  cur.n += 1;
  return cur.n > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let s: ValuationSubmission;
  try {
    s = (await request.json()) as ValuationSubmission;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot anti-bot (campo escondido preenchido → ignora silenciosamente).
  if ((s as unknown as { website?: string }).website) {
    return NextResponse.json({ ok: true, id: "ignored" });
  }

  const errors = validateSubmission(s);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "validation", fields: errors }, { status: 422 });
  }

  // Deduplicação de curto prazo (mesmo pedido reenviado).
  const key = dedupeKey(s);
  const now = Date.now();
  const last = RECENT.get(key);
  if (last && now - last < DEDUPE_MS) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const newLead = buildLead(s);

  let lead;
  try {
    lead = await createLead(newLead);
  } catch {
    // Não perder o pedido: devolve estado de retry ao cliente.
    return NextResponse.json({ error: "persist_failed", retry: true }, { status: 503 });
  }

  RECENT.set(key, now);

  // Notifica o consultor atribuído (best-effort; não bloqueia).
  const owner = newLead.assignedAgentId ? agentById(newLead.assignedAgentId) : undefined;
  let channels: string[] = [];
  try {
    channels = await notifyLead(lead, {
      agentName: owner?.name,
      agentEmail: owner ? agentEmail(owner) : undefined,
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, id: lead.id, assigned: owner?.name ?? null, notified: channels.length > 0 });
}
