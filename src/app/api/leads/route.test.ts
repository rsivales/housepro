import { describe, it, expect } from "vitest";

import { POST } from "./route";

/**
 * Testa a recolha de leads da página de imóvel (sem Supabase configurado →
 * grava em memória, notificação no-op). Cobre: campos obrigatórios, RGPD,
 * atribuição por referência e passagem dos metadados de funil.
 */
function req(body: unknown): Request {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads (página de imóvel)", () => {
  it("rejeita sem nome/contacto", async () => {
    const res = await POST(req({ propertyId: "1", consent: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_fields");
  });

  it("exige consentimento RGPD", async () => {
    const res = await POST(req({ propertyId: "1", name: "Rita", contact: "912000000", consent: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("consent_required");
  });

  it("cria a lead e resolve o consultor do imóvel", async () => {
    const res = await POST(
      req({
        propertyId: "1",
        intent: "visita",
        name: "Rita",
        contact: "912000000",
        consent: true,
        subSource: "Página de imóvel",
        pageUrl: "http://localhost/imovel/1",
        utm: { utm_source: "google" },
        contactPreference: "whatsapp",
        marketingConsent: true,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBeTruthy();
    expect(json.owner).toBeTruthy(); // angariador do imóvel
  });

  it("aceita atribuição por referência (?ref) sem erro", async () => {
    const res = await POST(
      req({ propertyId: "1", ref: "rui", name: "Rita", contact: "912000000", consent: true })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(typeof json.owner === "string" || json.owner === null).toBe(true);
  });
});
