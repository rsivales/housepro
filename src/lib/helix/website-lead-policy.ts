/**
 * HELIX website event classification.
 * A website click is NEVER evidence of an actual inbound call/message.
 * This module is intentionally side-effect-free and does not create CRM records.
 */
export type WebsiteEventKind =
  | "property_view"
  | "phone_click"
  | "whatsapp_click"
  | "favorite_click"
  | "form_submitted"
  | "visit_requested"
  | "valuation_requested"
  | "simulation_submitted"
  | "contact_received";

export type WebsiteEventClassification = "property_engagement" | "lead_candidate";

const engagementEvents: ReadonlySet<WebsiteEventKind> = new Set([
  "property_view", "phone_click", "whatsapp_click", "favorite_click",
]);

const leadCandidateEvents: ReadonlySet<WebsiteEventKind> = new Set([
  "form_submitted", "visit_requested", "valuation_requested",
  "simulation_submitted", "contact_received",
]);

export function classifyWebsiteEvent(kind: WebsiteEventKind): WebsiteEventClassification {
  if (engagementEvents.has(kind)) return "property_engagement";
  if (leadCandidateEvents.has(kind)) return "lead_candidate";
  throw new Error("Unsupported website event");
}

export function hasContactMethod(data: { email?: string | null; phone?: string | null }): boolean {
  const email = data.email?.trim() ?? "";
  const phone = data.phone?.replace(/[\s().-]/g, "") ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\+?[0-9]{9,15}$/.test(phone);
}

/** Only confirmed inbound contact or a submitted form with a usable reply channel is actionable. */
export function isActionableLead(
  kind: WebsiteEventKind,
  contact: { email?: string | null; phone?: string | null },
): boolean {
  return classifyWebsiteEvent(kind) === "lead_candidate" && hasContactMethod(contact);
}

/** 48 elapsed hours, not 2 business days. Server timestamps must be UTC-aware. */
export const LEAD_RESPONSE_SLA_MS = 48 * 60 * 60 * 1000;
export function leadResponseDeadline(receivedAt: Date): Date {
  if (Number.isNaN(receivedAt.getTime())) throw new Error("Invalid receivedAt");
  return new Date(receivedAt.getTime() + LEAD_RESPONSE_SLA_MS);
}
