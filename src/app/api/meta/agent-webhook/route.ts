import { NextResponse } from "next/server";
import { getVerifyToken, verifyWebhookSignature } from "@/lib/meta/secrets";
import { graph, metaAgentConfig, openPageToken, pageIdPattern } from "@/lib/meta/agent-pages";
import { createAdminClient } from "@/lib/supabase/admin";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = getVerifyToken();
  const challenge = params.get("hub.challenge");
  return token && challenge && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === token
    ? new Response(challenge)
    : new Response(null, { status: 403 });
}

type Event = { field?: string; value?: { page_id?: string; leadgen_id?: string; form_id?: string } };
type Payload = { object?: string; entry?: { id?: string; changes?: Event[] }[] };
type GraphLead = { id: string; form_id?: string; field_data?: { name: string; values: string[] }[] };

export async function POST(request: Request) {
  const config = metaAgentConfig();
  if (!config) return new Response(null, { status: 503 });
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response(null, { status: 401 });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw);
    if (!body || body.object !== "page" || !Array.isArray(body.entry)) return new Response(null, { status: 400 });
  } catch {
    return new Response(null, { status: 400 });
  }

  const db = createAdminClient();
  let processed = 0;
  let ignored = 0;
  let failed = false;
  for (const entry of body.entry) {
    for (const event of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (event?.field !== "leadgen") continue;
      const pageId = entry.id;
      const externalId = event.value?.leadgen_id;
      if (typeof pageId !== "string" || typeof externalId !== "string" ||
          !pageIdPattern.test(pageId) || !pageIdPattern.test(externalId) ||
          (event.value?.page_id && event.value.page_id !== pageId)) {
        ignored++;
        continue;
      }

      try {
        const { data: page, error } = await db.from("meta_agent_pages")
          .select("agent_id,sealed_token,connected_at").eq("page_id", pageId).maybeSingle();
        if (error) throw error;
        if (!page?.sealed_token) {
          ignored++;
          continue;
        }

        const token = openPageToken(page.sealed_token, config.key, pageId, page.agent_id);
        const lead = await graph<GraphLead>(config.version, externalId, token, { fields: "id,form_id,field_data" });
        if (lead.id !== externalId || !Array.isArray(lead.field_data) ||
            (event.value?.form_id && lead.form_id !== event.value.form_id)) {
          throw new Error("meta_lead_mismatch");
        }
        const fields = new Map(lead.field_data.map((field) => [field.name.toLowerCase(), field.values.join(", ")]));
        const email = fields.get("email") ?? null;
        const saved = await db.rpc("ingest_meta_agent_lead", {
          p_page_id: pageId, p_agent_id: page.agent_id, p_connection_time: page.connected_at,
          p_external_id: externalId, p_form_id: lead.form_id ?? null, p_name: fields.get("full_name") || fields.get("name") || "Lead do Facebook",
          p_contact: fields.get("phone_number") || fields.get("phone") || email || "",
          p_email: email, p_message: fields.get("message") ?? null,
          p_answers: Array.from(fields, ([question_key, value]) => ({ question_key, value })),
        });
        if (saved.error) throw saved.error;
        if (saved.data === "created") processed++;
        else if (saved.data === "connection_changed") ignored++;
      } catch {
        failed = true;
      }
    }
  }
  return NextResponse.json({ processed, ignored, retry: failed }, { status: failed ? 503 : 200 });
}
