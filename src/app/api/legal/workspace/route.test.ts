import { describe, it, expect } from "vitest";

import { GET, PUT } from "./route";

/**
 * Sem Supabase (ambiente de teste) a API responde persisted:false — o
 * workspace legal cai para localStorage sem erro nem perda de trabalho.
 */
describe("/api/legal/workspace — modo demo", () => {
  it("GET sem process → 400", async () => {
    const res = await GET(new Request("http://localhost/api/legal/workspace"));
    expect(res.status).toBe(400);
  });

  it("GET com process → persisted false", async () => {
    const res = await GET(new Request("http://localhost/api/legal/workspace?process=cpcv-2024-001"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.persisted).toBe(false);
    expect(json.data).toBeNull();
  });

  it("PUT não persiste sem Supabase", async () => {
    const res = await PUT(
      new Request("http://localhost/api/legal/workspace", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processId: "cpcv-2024-001", data: { version: 2 } }),
      })
    );
    expect((await res.json()).persisted).toBe(false);
  });
});
