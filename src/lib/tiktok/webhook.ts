import type { RawAnswer } from "@/lib/meta/ingest";

export interface TikTokLeadEvent {
  eventId: string;
  leadId: string;
  advertiserId?: string;
  campaignId?: string;
  formId?: string;
  answers: RawAnswer[];
}

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return undefined;
};

function parseFields(value: unknown): RawAnswer[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const row = record(item);
      const key = firstString(row.field_name, row.name, row.key, row.question_id, row.label);
      const raw = row.field_value ?? row.value ?? row.values ?? row.answer;
      const answer = Array.isArray(raw) ? raw.join(", ") : raw;
      return key && answer != null ? [{ key, value: String(answer) }] : [];
    });
  }
  const obj = record(value);
  return Object.entries(obj).map(([key, raw]) => ({
    key,
    value: Array.isArray(raw) ? raw.join(", ") : String(raw ?? ""),
  }));
}

/** Aceita as variantes documentadas/observadas do webhook sem guardar o corpo
 * bruto. Apenas os identificadores e respostas normalizadas seguem no sistema. */
export function parseTikTokLeadEvents(payload: unknown): TikTokLeadEvent[] {
  const root = record(payload);
  const candidates = Array.isArray(root.events)
    ? root.events
    : Array.isArray(root.data)
      ? root.data
      : [root];

  return candidates.flatMap((candidate, index) => {
    const event = record(candidate);
    const data = record(event.data ?? event.payload ?? event.lead ?? event);
    const lead = record(data.lead ?? data.lead_data ?? data);
    const leadId = firstString(lead.lead_id, lead.id, data.lead_id, event.lead_id);
    if (!leadId) return [];
    const eventId =
      firstString(event.event_id, event.id, data.event_id) ?? `${leadId}:${index}`;
    return [{
      eventId,
      leadId,
      advertiserId: firstString(data.advertiser_id, lead.advertiser_id, event.advertiser_id),
      campaignId: firstString(data.campaign_id, lead.campaign_id, event.campaign_id),
      formId: firstString(data.form_id, lead.form_id, event.form_id),
      answers: parseFields(
        lead.field_data ?? lead.fields ?? lead.answers ?? data.field_data ?? data.fields
      ),
    }];
  });
}
