import { describe, expect, it } from "vitest";
import {
  classifyWebsiteEvent,
  isActionableLead,
  leadResponseDeadline,
} from "./website-lead-policy";

describe("HELIX website lead policy", () => {
  it("keeps anonymous WhatsApp and phone clicks as engagement, not leads", () => {
    expect(classifyWebsiteEvent("whatsapp_click")).toBe("property_engagement");
    expect(classifyWebsiteEvent("phone_click")).toBe("property_engagement");
    expect(isActionableLead("phone_click", { phone: "+351912345678" })).toBe(false);
  });

  it("requires a usable reply channel for submitted requests", () => {
    expect(isActionableLead("form_submitted", { email: "cliente@example.com" })).toBe(true);
    expect(isActionableLead("visit_requested", { phone: "912 345 678" })).toBe(true);
    expect(isActionableLead("form_submitted", { email: "invalid", phone: "" })).toBe(false);
  });

  it("uses 48 elapsed hours across month boundaries", () => {
    expect(leadResponseDeadline(new Date("2026-10-31T23:00:00Z")).toISOString())
      .toBe("2026-11-02T23:00:00.000Z");
  });
});
