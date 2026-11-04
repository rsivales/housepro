import { describe, expect, it } from "vitest";
import { normalizeContactPhone } from "./phone";

describe("normalizeContactPhone", () => {
  it("accepts Portuguese and international telephone formats", () => {
    expect(normalizeContactPhone("912 345 678")).toBe("912345678");
    expect(normalizeContactPhone("+351 912 345 678")).toBe("+351912345678");
    expect(normalizeContactPhone("00351 912 345 678")).toBe("+351912345678");
  });

  it("rejects missing, short and implausibly long values", () => {
    expect(normalizeContactPhone("")).toBeNull();
    expect(normalizeContactPhone("12345")).toBeNull();
    expect(normalizeContactPhone("+1234567890123456")).toBeNull();
  });
});
