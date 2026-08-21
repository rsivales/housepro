import { describe, it, expect } from "vitest";

import {
  renderVariables,
  matchSegment,
  selectRecipients,
  simulateSend,
} from "@/lib/data/xcampaigns";
import { demoContacts, type Contact } from "@/lib/data/contacts";

describe("personalização", () => {
  it("substitui variáveis conhecidas e mantém as desconhecidas", () => {
    expect(renderVariables("Olá {nome}, da {agencia}", { nome: "Ana", agencia: "HousePro" })).toBe(
      "Olá Ana, da HousePro"
    );
    expect(renderVariables("Olá {desconhecida}", {})).toBe("Olá {desconhecida}");
  });
});

describe("segmentação", () => {
  const now = new Date("2026-08-20T12:00:00Z");
  const c: Contact = {
    id: "x",
    name: "Teste",
    type: "comprador",
    ownerId: "carla",
    agencyId: "algarve",
    zone: "Albufeira",
    tags: ["meta", "quente"],
    source: "facebook",
    consent: { base: "consentimento" },
    createdAt: "2026-01-01T00:00:00Z",
    lastActivityAt: "2026-08-01T00:00:00Z",
  };

  it("filtra por tipo/zona/agência/tags", () => {
    expect(matchSegment(c, { type: "comprador" }, now)).toBe(true);
    expect(matchSegment(c, { type: "vendedor" }, now)).toBe(false);
    expect(matchSegment(c, { zone: "albufeira" }, now)).toBe(true);
    expect(matchSegment(c, { tags: ["meta"] }, now)).toBe(true);
    expect(matchSegment(c, { tags: ["luxo"] }, now)).toBe(false);
  });
  it("exige consentimento quando pedido", () => {
    expect(matchSegment({ ...c, consent: undefined }, { requireConsent: true }, now)).toBe(false);
    expect(matchSegment(c, { requireConsent: true }, now)).toBe(true);
  });
  it("filtra inativos por dias", () => {
    // última atividade 2026-08-01, agora 2026-08-20 → 19 dias
    expect(matchSegment(c, { inactiveDays: 14 }, now)).toBe(true);
    expect(matchSegment(c, { inactiveDays: 30 }, now)).toBe(false);
  });
  it("selectRecipients devolve um subconjunto", () => {
    const compradores = selectRecipients(demoContacts, { type: "comprador" });
    expect(compradores.every((x) => x.type === "comprador")).toBe(true);
    expect(compradores.length).toBeLessThanOrEqual(demoContacts.length);
  });
});

describe("envio sandbox (determinístico)", () => {
  it("calcula estatísticas coerentes", () => {
    const s = simulateSend(100);
    expect(s.sent).toBe(100);
    expect(s.delivered).toBe(98); // 2% bounce
    expect(s.opened).toBeGreaterThan(0);
    expect(s.clicked).toBeLessThanOrEqual(s.opened);
    expect(s.delivered + s.bounced).toBe(s.sent);
  });
  it("zero destinatários dá tudo a zero", () => {
    expect(simulateSend(0)).toEqual({ sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 });
  });
});
