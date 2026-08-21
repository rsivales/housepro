import { describe, it, expect } from "vitest";

import { universalSearch } from "@/lib/data/search";
import { demoContacts } from "@/lib/data/contacts";
import { mockMetaLeads } from "@/lib/data/leads";
import { demoCampaigns } from "@/lib/data/meta";
import { buildHealthSnapshot, worstSeverity } from "@/lib/data/observability";
import { can } from "@/lib/data/permissions";

describe("pesquisa universal", () => {
  const data = { contacts: demoContacts, leads: mockMetaLeads, campaigns: demoCampaigns };

  it("ignora queries curtas", () => {
    expect(universalSearch("a", data)).toHaveLength(0);
  });
  it("encontra por nome de contacto", () => {
    const hits = universalSearch("helena", data);
    expect(hits.some((h) => h.kind === "contact" && h.title.includes("Helena"))).toBe(true);
  });
  it("encontra campanhas e classifica o tipo de resultado", () => {
    const hits = universalSearch("algarve", data);
    expect(hits.some((h) => h.kind === "campaign")).toBe(true);
    for (const h of hits) expect(["contact", "lead", "property", "campaign"]).toContain(h.kind);
  });
});

describe("observabilidade", () => {
  const snap = buildHealthSnapshot({
    metaConnected: false,
    unassignedLeads: 6,
    slaOverdue: 0,
    unmappedFields: 2,
    pendingApprovals: 1,
    lowCredits: 0,
    callsToday: 3,
    emailsSandbox: 1,
  });

  it("marca severidades por limiar", () => {
    const byKey = Object.fromEntries(snap.map((p) => [p.key, p]));
    expect(byKey.unassigned.severity).toBe("crit"); // 6 >= 5
    expect(byKey.unmapped.severity).toBe("warn"); // 2 entre 1 e 5
    expect(byKey.sla.severity).toBe("ok");
    expect(byKey.meta.severity).toBe("warn"); // demo
  });
  it("worstSeverity resume o pior", () => {
    expect(worstSeverity(snap)).toBe("crit");
  });
});

describe("permissões (novos papéis)", () => {
  it("marketing gere campanhas mas não vê comissões", () => {
    expect(can("marketing", "manage_campaigns")).toBe(true);
    expect(can("marketing", "view_commissions")).toBe(false);
  });
  it("recrutamento só acede ao recrutamento", () => {
    expect(can("recrutamento", "access_recruitment")).toBe(true);
    expect(can("recrutamento", "view_client_data")).toBe(false);
  });
  it("diretor aprova despesas; agente não", () => {
    expect(can("diretor", "approve_expenses")).toBe(true);
    expect(can("agente", "approve_expenses")).toBe(false);
  });
  it("parceiro não tem capacidades de gestão", () => {
    expect(can("parceiro", "view_client_data")).toBe(false);
    expect(can("parceiro", "manage_market")).toBe(false);
  });
});
