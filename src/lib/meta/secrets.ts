import crypto from "node:crypto";

/**
 * Cofre de segredos da integração Meta — SÓ server-side.
 *
 * Regra de ouro (auditoria): tokens e segredos NUNCA vivem no frontend, nos logs
 * ou no repositório. Este módulo lê-os de variáveis de ambiente do servidor e
 * expõe apenas operações (verificar assinatura, resolver token por referência),
 * nunca os valores em claro. Toda a escrita para log passa por `mask()`.
 *
 * Variáveis de ambiente (configuradas no servidor/Vercel, nunca NEXT_PUBLIC_):
 *  - META_APP_SECRET      → segredo da app (assinatura dos webhooks).
 *  - META_VERIFY_TOKEN    → token de verificação do webhook (handshake GET).
 *  - META_PAGE_TOKEN      → token de acesso à Página (fallback único).
 *  - META_PAGE_TOKEN__<ref> → token por referência (ex.: token_ref="page:123"
 *                            → META_PAGE_TOKEN__PAGE_123).
 */

/** Mascara um valor sensível para poder aparecer em logs sem o revelar. */
export function mask(value: string | undefined | null): string {
  if (!value) return "∅";
  const s = String(value);
  if (s.length <= 4) return "•".repeat(s.length);
  return `${s.slice(0, 2)}…${s.slice(-2)} (${s.length})`;
}

/** Mascara campos de PII de um objeto (para logs de leads). */
export function maskPII<T extends Record<string, unknown>>(obj: T): T {
  const SENSITIVE = ["email", "phone", "phone_number", "contact", "contacto", "name", "full_name"];
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) {
    if (SENSITIVE.some((s) => k.toLowerCase().includes(s))) {
      out[k] = mask(String(out[k] ?? ""));
    }
  }
  return out as T;
}

export function getAppSecret(): string | undefined {
  return process.env.META_APP_SECRET || undefined;
}

export function getVerifyToken(): string | undefined {
  return process.env.META_VERIFY_TOKEN || undefined;
}

/**
 * Resolve o token de acesso à Página a partir de uma REFERÊNCIA (token_ref).
 * O token em si vem sempre do ambiente do servidor — a base de dados só guarda
 * a referência. Devolve undefined se não estiver configurado (modo demo).
 */
export function resolvePageToken(tokenRef?: string): string | undefined {
  if (tokenRef) {
    const key = "META_PAGE_TOKEN__" + tokenRef.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
    if (process.env[key]) return process.env[key];
  }
  return process.env.META_PAGE_TOKEN || undefined;
}

/** Estão configurados os segredos mínimos para uma ligação Meta real? */
export function isMetaConfigured(): boolean {
  return Boolean(getAppSecret() && getVerifyToken());
}

/**
 * Verifica a assinatura HMAC-SHA256 de um webhook do Meta.
 * O Meta envia o cabeçalho `X-Hub-Signature-256: sha256=<hex>`; validamos com
 * o segredo da app sobre o corpo BRUTO do pedido. Comparação em tempo constante.
 *
 * Em modo demo (sem META_APP_SECRET) devolve `false` — nunca aceitamos webhooks
 * não assinados como se fossem reais; o fluxo demo usa /api/meta/mock-lead.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getAppSecret();
  if (!secret || !signatureHeader) return false;
  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(digest, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
