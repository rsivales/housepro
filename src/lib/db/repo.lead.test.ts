import { describe, it, expect } from "vitest";

import { createLead } from "./repo";

/**
 * Sem Supabase configurado, createLead devolve a lead em memória preservando
 * os metadados de funil (origem/campanha) que a página de imóvel recolhe.
 */
describe("createLead — metadados de funil", () => {
  it("preserva subSource, utm, contactPreference e marketingConsent", async () => {
    const lead = await createLead({
      propertyId: "1",
      ownerId: "ana",
      name: "Rita",
      contact: "912000000",
      intent: "visita",
      source: "site",
      subSource: "Página de imóvel",
      pageUrl: "http://localhost/imovel/1",
      utm: { utm_source: "google", utm_medium: "cpc" },
      contactPreference: "whatsapp",
      marketingConsent: true,
    });

    expect(lead.id).toBeTruthy();
    expect(lead.status).toBe("novo");
    expect(lead.subSource).toBe("Página de imóvel");
    expect(lead.utm?.utm_source).toBe("google");
    expect(lead.contactPreference).toBe("whatsapp");
    expect(lead.marketingConsent).toBe(true);
  });
});
