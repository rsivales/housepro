import { describe, it, expect } from "vitest";

import { GET, POST, DELETE } from "./route";

/**
 * Sem Supabase (ambiente de teste) não há sessão de comprador → 401. O cliente
 * cai para o localStorage. Garante que a área pública nunca rebenta.
 */
describe("/api/cliente/favoritos — sem sessão", () => {
  it("GET responde 401", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST responde 401", async () => {
    const res = await POST(
      new Request("http://localhost/api/cliente/favoritos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: "1" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("DELETE responde 401", async () => {
    const res = await DELETE(new Request("http://localhost/api/cliente/favoritos?propertyId=1", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });
});
