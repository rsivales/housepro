import { describe, it, expect } from "vitest";

import { GET, PUT } from "./route";

/**
 * Sem Supabase configurado (ambiente de teste) a API responde persisted:false,
 * garantindo que o cliente cai para o localStorage sem erro nem perda de dados.
 */
describe("/api/me/settings — modo demo/sem Supabase", () => {
  it("GET devolve settings null e persisted false", async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.persisted).toBe(false);
    expect(json.settings).toBeNull();
  });

  it("PUT não persiste mas não rebenta", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch: { "helix:widgets": ["agenda", "leads"] } }),
      })
    );
    const json = await res.json();
    expect(json.persisted).toBe(false);
  });
});
