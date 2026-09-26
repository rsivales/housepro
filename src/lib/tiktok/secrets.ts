import crypto from "node:crypto";

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_WEBHOOK_SECRET || process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN);
}

/** Valida HMAC-SHA256 quando a plataforma envia assinatura, ou o token Bearer
 * acordado na configuração do webhook. Nunca aceita pedidos reais sem segredo. */
export function verifyTikTokWebhook(
  rawBody: string,
  headers: Headers
): boolean {
  const secret = process.env.TIKTOK_WEBHOOK_SECRET;
  const signature =
    headers.get("x-tiktok-signature") ??
    headers.get("tiktok-signature") ??
    headers.get("x-signature");

  if (secret && signature) {
    const supplied = signature.replace(/^sha256=/i, "");
    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(supplied, "hex");
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  const verifyToken = process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return false;
  const suppliedToken =
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    headers.get("x-tiktok-verification-token") ??
    headers.get("x-webhook-token");
  if (!suppliedToken) return false;
  const a = Buffer.from(verifyToken);
  const b = Buffer.from(suppliedToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
