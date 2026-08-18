import { NextResponse } from "next/server";

import {
  getVerifyToken,
  verifyWebhookSignature,
  isMetaConfigured,
  maskPII,
} from "@/lib/meta/secrets";

/**
 * Webhook do Meta (Lead Ads).
 *
 *  GET  → handshake de verificação (hub.mode/hub.verify_token/hub.challenge).
 *  POST → receção de eventos leadgen, com verificação de assinatura HMAC.
 *
 * SEGURANÇA: só se aceitam pedidos com assinatura válida (X-Hub-Signature-256).
 * Em modo demo (sem segredos configurados) o webhook responde mas NÃO processa
 * nada como real — o fluxo de demonstração usa /api/meta/mock-lead.
 *
 * O corpo real de um evento traz apenas identificadores (form_id, leadgen_id);
 * os dados do titular obtêm-se depois via Graph API com o token da Página
 * (server-side). Esse passo fica documentado como stub até haver credenciais.
 */

// Handshake de verificação da subscrição.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verify = getVerifyToken();
  if (mode === "subscribe" && verify && token === verify && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

interface LeadgenChange {
  value?: { form_id?: string; leadgen_id?: string; page_id?: string };
}
interface WebhookEntry {
  id?: string;
  changes?: LeadgenChange[];
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Sem segredos configurados: modo demo — reconhecemos sem processar.
  if (!isMetaConfigured()) {
    return NextResponse.json({ ok: true, demo: true, processed: 0 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: { entry?: WebhookEntry[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const events: { formId?: string; leadgenId?: string; pageId?: string }[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      events.push({ formId: v.form_id, leadgenId: v.leadgen_id, pageId: v.page_id });
    }
  }

  // Log seguro (sem PII/segredos).
  console.info(
    "[meta:webhook] eventos leadgen:",
    events.map((e) => maskPII(e as Record<string, unknown>))
  );

  // NOTA: a obtenção dos dados do titular (Graph API GET /{leadgen_id}) e a
  // ingestão real fazem-se aqui quando houver token de Página configurado.
  // Até lá, reconhecemos o evento (o Meta reexpede se não devolvermos 200).
  return NextResponse.json({ ok: true, received: events.length });
}
