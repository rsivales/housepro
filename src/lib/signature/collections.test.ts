import { describe, expect, it } from "vitest";
import { getSignatureCollection, SIGNATURE_COLLECTIONS } from "./collections";
import { signatureImageSources, signaturePropertyHref } from "./media";

describe("Signature collections and real media", () => {
  it("resolves all canonical themes and existing accented labels", () => {
    for (const collection of SIGNATURE_COLLECTIONS) {
      expect(getSignatureCollection(collection.slug)).toBe(collection);
      expect(getSignatureCollection(` ${collection.label} `)).toBe(collection);
    }
  });
  it("does not assign unknown or missing themes", () => {
    expect(getSignatureCollection(null)).toBeUndefined();
    expect(getSignatureCollection("Algarve")).toBeUndefined();
  });
  it("uses the real cover and gallery when the editorial hero is blank", () => {
    expect(signatureImageSources({ signatureHeroUrl: " ", image: "https://storage.example/cover.jpg", gallery: ["https://storage.example/cover.jpg", "https://storage.example/second.jpg", "", "javascript:alert(1)"] })).toEqual(["https://storage.example/cover.jpg", "https://storage.example/second.jpg"]);
  });
  it("uses a stable property ID when the SEO slug is empty and preserves referral", () => {
    expect(signaturePropertyHref({ id: "real-id", slug: " " }, "agent-id")).toBe("/signature/real-id?ref=agent-id");
  });
});
