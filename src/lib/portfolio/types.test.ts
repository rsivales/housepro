import { describe, it, expect } from "vitest";
import {
  generateUnits,
  preserveUnitEdits,
  operationalState,
  validUnits,
  daysSince,
  type PortfolioItem,
} from "./types";
const source = {
  id: "source",
  title: "Apartamento T2",
  typology: "T2",
  price: 300000,
  area: 100,
  areaUtil: 90,
  beds: 2,
  baths: 2,
} as PortfolioItem;
describe("Portfolio bulk input", () => {
  it("generates 70 editable fractions with distinct labels and preserves real base values", () => {
    const units = generateUnits(source, 70, "A", 1);
    expect(units).toHaveLength(70);
    expect(units[0].label).toBe("A01");
    expect(units[69].label).toBe("A70");
    expect(new Set(units.map((u) => u.label)).size).toBe(70);
    expect(
      units.every(
        (u) => u.price === 300000 && u.area === 100 && u.areaUtil === 90,
      ),
    ).toBe(true);
    expect(validUnits(units)).toBe(true);
  });
  it("rejects malformed, duplicate-label and oversized batches", () => {
    const units = generateUnits(source, 2, "A", 1);
    expect(validUnits([{ ...units[0], price: -1 }])).toBe(false);
    expect(validUnits([{ ...units[0], beds: 1.5 }])).toBe(false);
    expect(validUnits([units[0], units[0]])).toBe(false);
    expect(validUnits(generateUnits(source, 101, "A", 1))).toBe(false);
    expect(validUnits([{ ...units[0], area: Infinity }])).toBe(false);
  });
  it("keeps unknown dates unknown instead of inventing inactivity", () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince("bad-date")).toBeNull();
    expect(
      daysSince("2026-10-01T00:00:00Z", Date.parse("2026-10-13T00:00:00Z")),
    ).toBe(12);
  });
});

it("separates publication from commercial reservation", () => {
  expect(operationalState({ state: "reservado" })).toBe("activo");
  expect(operationalState({ state: "cpcv" })).toBe("inactivo");
  expect(operationalState({ state: "rascunho" })).toBe("rascunho");
});

it("keeps edited prices and areas when a batch grows from 20 to 70 rows", () => {
  const initial = generateUnits(source, 20, "A", 1);
  initial[0].price = 290000;
  initial[3].area = 125;
  const extended = preserveUnitEdits(
    generateUnits(source, 70, "B", 1),
    initial,
    new Set(["0:price", "3:area"]),
  );
  expect(extended[0].price).toBe(290000);
  expect(extended[3].area).toBe(125);
  expect(extended[0].label).toBe("B01");
  expect(extended[69].price).toBe(300000);
});
