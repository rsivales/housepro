import { describe, it, expect } from "vitest";
import { easterDate, occasionDate, occasionsOnDate } from "./holidays";

describe("easterDate", () => {
  it("matches known Easter Sundays", () => {
    expect(easterDate(2024).toISOString().slice(0, 10)).toBe("2024-03-31");
    expect(easterDate(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(easterDate(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterDate(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });
});

describe("occasionDate", () => {
  it("places Carnaval 47 days before Easter", () => {
    expect(occasionDate("carnaval", 2025).toISOString().slice(0, 10)).toBe("2025-03-04");
  });
  it("fixed dates", () => {
    expect(occasionDate("natal", 2026).toISOString().slice(0, 10)).toBe("2026-12-25");
    expect(occasionDate("abril_25", 2026).toISOString().slice(0, 10)).toBe("2026-04-25");
    expect(occasionDate("dia_pai", 2026).toISOString().slice(0, 10)).toBe("2026-03-19");
  });
  it("dia da mãe falls on the first Sunday of May", () => {
    const d = occasionDate("dia_mae", 2026);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDate()).toBeLessThanOrEqual(7);
    expect(d.getUTCDay()).toBe(0);
  });
});

describe("occasionsOnDate", () => {
  it("finds Christmas on Dec 25", () => {
    expect(occasionsOnDate(new Date(Date.UTC(2026, 11, 25)))).toEqual(["natal"]);
  });
  it("finds nothing on an ordinary day", () => {
    expect(occasionsOnDate(new Date(Date.UTC(2026, 6, 10)))).toEqual([]);
  });
});
