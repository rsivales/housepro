import { describe, it, expect } from "vitest";

import { GET, PUT } from "./route";

/**
 * Sem Supabase (ambiente de teste) a API responde persisted:false — o site
 * público usa localStorage/defaults e o admin cai para cache local.
 */
function put(body: unknown): Request {
  return new Request("http://localhost/api/brand/site-content", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/brand/site-content — modo demo", () => {
  it("GET devolve content vazio e persisted false", async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.persisted).toBe(false);
    expect(json.content).toEqual({});
  });

  it("PUT não persiste sem Supabase", async () => {
    const res = await PUT(put({ section: "banners", value: [] }));
    expect((await res.json()).persisted).toBe(false);
  });
});
