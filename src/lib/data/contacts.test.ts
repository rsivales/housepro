import { describe, it, expect } from "vitest";

import {
  buildTimeline,
  lastActivityAt,
  demoContacts,
  activitiesForContact,
  type ContactActivity,
} from "@/lib/data/contacts";

const act = (id: string, at: string): ContactActivity => ({
  id,
  contactId: "ct-1",
  type: "note",
  title: "n",
  at,
});

describe("cronologia única", () => {
  it("ordena do mais recente para o mais antigo", () => {
    const items = [
      act("a", "2026-08-10T09:00:00"),
      act("b", "2026-08-12T09:00:00"),
      act("c", "2026-08-11T09:00:00"),
    ];
    const t = buildTimeline(items);
    expect(t.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("lastActivityAt devolve a mais recente", () => {
    expect(lastActivityAt([act("a", "2026-08-10T09:00:00"), act("b", "2026-08-12T09:00:00")])).toBe(
      "2026-08-12T09:00:00"
    );
    expect(lastActivityAt([])).toBeUndefined();
  });

  it("a cronologia demo de um contacto vem ordenada", () => {
    const ct = demoContacts[0];
    const t = activitiesForContact(ct.id);
    for (let i = 1; i < t.length; i++) {
      expect(t[i - 1].at.localeCompare(t[i].at)).toBeGreaterThanOrEqual(0);
    }
  });
});
