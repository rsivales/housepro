import { NextResponse } from "next/server";

import { hasServiceRole } from "@/lib/supabase/admin";
import {
  finishSocialWebhookEvent,
  getSocialWebhookContext,
  registerSocialWebhookEvent,
} from "@/lib/db/repo";
import { processSocialLead } from "@/lib/social/process-lead";
import { isTikTokConfigured, verifyTikTokWebhook } from "@/lib/tiktok/secrets";
import { parseTikTokLeadEvents } from "@/lib/tiktok/webhook";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "tiktok",
    configured: isTikTokConfigured() && hasServiceRole(),
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!isTikTokConfigured() || !hasServiceRole()) {
    return NextResponse.json({ error: "integration_not_configured" }, { status: 503 });
  }
  if (!verifyTikTokWebhook(raw, request.headers)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const challenge =
    payload && typeof payload === "object" && "challenge" in payload
      ? String((payload as { challenge?: unknown }).challenge ?? "")
      : "";
  if (challenge) return NextResponse.json({ challenge });

  const events = parseTikTokLeadEvents(payload);
  if (events.length === 0) {
    return NextResponse.json({ error: "no_lead_events" }, { status: 400 });
  }

  let processed = 0;
  let duplicates = 0;
  const failures: string[] = [];

  for (const event of events) {
    const registration = await registerSocialWebhookEvent({
      provider: "tiktok",
      eventId: event.eventId,
      externalLeadId: event.leadId,
      externalCampaignId: event.campaignId,
      externalFormId: event.formId,
    });
    if (registration === "duplicate") {
      duplicates += 1;
      continue;
    }
    if (registration === "unavailable") {
      failures.push("event_store_unavailable");
      continue;
    }

    try {
      const { campaign, form } = await getSocialWebhookContext({
        provider: "tiktok",
        externalCampaignId: event.campaignId,
        externalFormId: event.formId,
      });
      if (!campaign) throw new Error("campaign_mapping_missing");
      if (event.answers.length === 0) throw new Error("lead_fields_missing");

      await processSocialLead({
        provider: "tiktok",
        campaign,
        form,
        externalLeadId: event.leadId,
        answers: event.answers,
        trustedWebhook: true,
      });
      await finishSocialWebhookEvent({
        provider: "tiktok",
        eventId: event.eventId,
        status: "processed",
      });
      processed += 1;
    } catch (error) {
      const code = error instanceof Error ? error.message : "processing_failed";
      failures.push(code);
      await finishSocialWebhookEvent({
        provider: "tiktok",
        eventId: event.eventId,
        status: "failed",
        errorCode: code,
      });
    }
  }

  if (failures.length) {
    return NextResponse.json(
      { ok: false, processed, duplicates, failed: failures.length, errors: failures },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, processed, duplicates });
}
