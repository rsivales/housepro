import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { parseTikTokLeadEvents } from "@/lib/tiktok/webhook";
import { verifyTikTokWebhook } from "@/lib/tiktok/secrets";

describe("TikTok lead webhook", () => {
  afterEach(() => {
    delete process.env.TIKTOK_WEBHOOK_SECRET;
    delete process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN;
  });

  it("normaliza identificadores e campos sem perder respostas", () => {
    const [event] = parseTikTokLeadEvents({
      event_id: "evt-1",
      data: {
        lead_id: "lead-1",
        campaign_id: "campaign-1",
        form_id: "form-1",
        field_data: [
          { field_name: "full_name", field_value: "Maria" },
          { field_name: "phone_number", field_value: "+351900000000" },
        ],
      },
    });
    expect(event).toMatchObject({
      eventId: "evt-1",
      leadId: "lead-1",
      campaignId: "campaign-1",
      formId: "form-1",
    });
    expect(event.answers).toEqual([
      { key: "full_name", value: "Maria" },
      { key: "phone_number", value: "+351900000000" },
    ]);
  });

  it("aceita assinatura HMAC correta e rejeita a incorreta", () => {
    process.env.TIKTOK_WEBHOOK_SECRET = "test-secret";
    const raw = JSON.stringify({ event_id: "evt-1" });
    const signature = crypto.createHmac("sha256", "test-secret").update(raw).digest("hex");
    expect(verifyTikTokWebhook(raw, new Headers({ "x-tiktok-signature": `sha256=${signature}` }))).toBe(true);
    expect(verifyTikTokWebhook(raw, new Headers({ "x-tiktok-signature": "sha256=00" }))).toBe(false);
  });

  it("aceita token Bearer configurado", () => {
    process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN = "verify-me";
    expect(verifyTikTokWebhook("{}", new Headers({ authorization: "Bearer verify-me" }))).toBe(true);
  });
});
