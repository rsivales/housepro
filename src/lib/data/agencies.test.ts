import { describe, it, expect } from "vitest";

import { mergeAgencies, type AgenciesConfig } from "./agencies";
import type { Agency } from "./types";

const base: Agency[] = [
  { id: "porto", name: "HousePro Porto", slug: "porto", region: "Porto", code: 2 },
  { id: "lisboa", name: "HousePro Lisboa", slug: "lisboa", region: "Lisboa", code: 1 },
];

describe("mergeAgencies", () => {
  it("aplica overrides e acrescenta criadas", () => {
    const cfg: AgenciesConfig = {
      overrides: { porto: { name: "HousePro Grande Porto" } },
      created: [{ id: "ag-aveiro", name: "HousePro Aveiro", slug: "aveiro", region: "Aveiro", code: 3 }],
    };
    const out = mergeAgencies(base, cfg);
    expect(out.find((a) => a.id === "porto")?.name).toBe("HousePro Grande Porto");
    expect(out.some((a) => a.id === "ag-aveiro")).toBe(true);
    expect(out).toHaveLength(3);
  });

  it("esconde eliminadas e suspensas no site público", () => {
    const cfg: AgenciesConfig = {
      overrides: {},
      created: [{ id: "ag-aveiro", name: "HousePro Aveiro", slug: "aveiro", region: "Aveiro", code: 3 }],
      removed: ["lisboa"],
      suspended: ["ag-aveiro"],
    };
    const publicList = mergeAgencies(base, cfg);
    expect(publicList.some((a) => a.id === "lisboa")).toBe(false); // eliminada
    expect(publicList.some((a) => a.id === "ag-aveiro")).toBe(false); // suspensa
    expect(publicList.map((a) => a.id)).toEqual(["porto"]);
  });

  it("includeHidden mantém tudo (back office)", () => {
    const cfg: AgenciesConfig = { overrides: {}, created: [], removed: ["lisboa"], suspended: ["porto"] };
    const admin = mergeAgencies(base, cfg, { includeHidden: true });
    expect(admin.map((a) => a.id).sort()).toEqual(["lisboa", "porto"]);
  });
});
