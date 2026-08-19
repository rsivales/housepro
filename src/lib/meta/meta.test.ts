import { describe, it, expect } from "vitest";

import {
  demoCampaigns,
  campaignById,
  leadFormById,
  fieldMappingForForm,
  demoAssignmentRules,
  META_PIPELINES,
  type AssignmentRule,
} from "@/lib/data/meta";
import {
  normalizeAnswers,
  buildMetaLead,
  sampleAnswersForForm,
  detectUnmappedQuestions,
} from "@/lib/meta/ingest";
import { resolveAssignment } from "@/lib/meta/assignment";
import { scoreLead } from "@/lib/meta/scoring";
import { buildMetaReport } from "@/lib/meta/report";
import { automationSummary, leadSlaOverdue } from "@/lib/meta/automations";
import type { Lead } from "@/lib/data/leads";

describe("normalização de respostas", () => {
  const form = leadFormById("form-1")!;
  const mapping = fieldMappingForForm("form-1");
  const raw = [
    { key: "full_name", value: "Maria Teste" },
    { key: "email", value: "maria@email.pt" },
    { key: "phone_number", value: "351961234567" },
    { key: "budget", value: "250k–500k" },
    { key: "zone", value: "Albufeira" },
    { key: "message", value: "Procuro apartamento com vista para o mar, urgente." },
  ];
  const norm = normalizeAnswers(raw, form, mapping);

  it("mapeia campos conhecidos", () => {
    expect(norm.fields.name).toBe("Maria Teste");
    expect(norm.fields.contact).toBe("351961234567");
    expect(norm.fields.zone).toBe("Albufeira");
  });
  it("guarda todas as respostas e marca PII", () => {
    expect(norm.answers).toHaveLength(raw.length);
    expect(norm.answers.find((a) => a.questionKey === "phone_number")?.pii).toBe(true);
  });
});

describe("pontuação", () => {
  it("sobe com completude/intenção e mantém-se em 0–100", () => {
    const magra = scoreLead({ contact: "" });
    const rica = scoreLead({
      contact: "351900000000",
      email: "x@y.pt",
      intent: "visita",
      budget: "+1M",
      zone: "Loulé",
      message: "Mensagem bem detalhada com bastante contexto.",
    });
    expect(rica.score).toBeGreaterThan(magra.score);
    expect(rica.score).toBeLessThanOrEqual(100);
    expect(magra.score).toBeGreaterThanOrEqual(0);
  });
});

describe("construção da lead", () => {
  it("nasce sem responsável, com origem comercial e consentimento", () => {
    const campaign = campaignById("cmp-1")!;
    const form = leadFormById("form-1");
    const norm = normalizeAnswers(sampleAnswersForForm(form!), form, fieldMappingForForm("form-1"));
    const lead = buildMetaLead(campaign, form, norm);
    expect(lead.unassigned).toBe(true);
    expect(lead.commercialOriginId).toBeTruthy();
    expect(lead.pipeline).toBe("compradores");
    expect(lead.consent?.base).toBeTruthy();
  });
});

describe("atribuição por regra", () => {
  const ruleFor = (id: string) => demoAssignmentRules.find((r) => r.campaignId === id);

  it("round-robin atribui o 1.º do pool e avança o índice", () => {
    const r = resolveAssignment({ campaign: campaignById("cmp-1")!, rule: ruleFor("cmp-1") });
    expect(r.assignedAgentId).toBe("carla");
    expect(r.unassigned).toBe(false);
    expect(r.rrIndexNext).toBe(1);
  });
  it("específico atribui o consultor indicado", () => {
    const r = resolveAssignment({ campaign: campaignById("cmp-2")!, rule: ruleFor("cmp-2") });
    expect(r.assignedAgentId).toBe("sofia");
  });
  it("property sem angariador vai para o inbox; com angariador vai para ele", () => {
    expect(resolveAssignment({ campaign: campaignById("cmp-3")!, rule: ruleFor("cmp-3") }).unassigned).toBe(true);
    expect(
      resolveAssignment({ campaign: campaignById("cmp-3")!, rule: ruleFor("cmp-3"), propertyOwnerId: "rui" }).assignedAgentId
    ).toBe("rui");
  });
  it("recrutamento fica no inbox", () => {
    expect(resolveAssignment({ campaign: campaignById("cmp-4")!, rule: ruleFor("cmp-4") }).unassigned).toBe(true);
  });
});

describe("estratégias de atribuição avançadas (F1)", () => {
  const campaign = campaignById("cmp-1")!;
  const base = (r: Partial<AssignmentRule>): AssignmentRule => ({
    id: "r",
    campaignId: "cmp-1",
    strategy: "unassigned",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...r,
  });

  it("rotação ponderada respeita os pesos", () => {
    const rule = base({ strategy: "round_robin_weighted", pool: ["a", "b"], weights: { a: 2, b: 1 }, rrIndex: 0 });
    // sequência = [a, a, b] → índice 0 → 'a', avança para 1
    const r0 = resolveAssignment({ campaign, rule });
    expect(r0.assignedAgentId).toBe("a");
    expect(r0.rrIndexNext).toBe(1);
    // índice 2 → 'b'
    expect(resolveAssignment({ campaign, rule: base({ strategy: "round_robin_weighted", pool: ["a", "b"], weights: { a: 2, b: 1 }, rrIndex: 2 }) }).assignedAgentId).toBe("b");
  });

  it("por orçamento / idioma / especialidade usa o mapa", () => {
    expect(resolveAssignment({ campaign, rule: base({ strategy: "budget", budgetMap: { "250k–500k": "carla" } }), budget: "250k–500k" }).assignedAgentId).toBe("carla");
    expect(resolveAssignment({ campaign, rule: base({ strategy: "language", languageMap: { en: "rui" } }), language: "EN" }).assignedAgentId).toBe("rui");
    expect(resolveAssignment({ campaign, rule: base({ strategy: "specialty", specialtyMap: { luxo: "ana" } }), specialty: "Luxo" }).assignedAgentId).toBe("ana");
  });

  it("substituto quando o destino está indisponível, senão fallback, senão inbox", () => {
    const rule = base({ strategy: "specific", agentId: "sofia", substituteId: "rui", fallbackId: "ana" });
    expect(resolveAssignment({ campaign, rule, unavailable: ["sofia"] }).assignedAgentId).toBe("rui");
    expect(resolveAssignment({ campaign, rule, unavailable: ["sofia", "rui"] }).assignedAgentId).toBe("ana");
    expect(resolveAssignment({ campaign, rule, unavailable: ["sofia", "rui", "ana"] }).unassigned).toBe(true);
  });

  it("limite diário empurra para o substituto", () => {
    const rule = base({ strategy: "specific", agentId: "sofia", substituteId: "rui" });
    expect(resolveAssignment({ campaign, rule, atCapacity: ["sofia"] }).assignedAgentId).toBe("rui");
  });

  it("primeiro a aceitar oferece ao conjunto disponível", () => {
    const rule = base({ strategy: "first_accept", pool: ["carla", "rui"] });
    const r = resolveAssignment({ campaign, rule, unavailable: ["carla"] });
    expect(r.unassigned).toBe(true);
    expect(r.offeredTo).toEqual(["rui"]);
  });

  it("manual fica no inbox", () => {
    expect(resolveAssignment({ campaign, rule: base({ strategy: "manual" }) }).unassigned).toBe(true);
  });
});

describe("pipelines completos e deteção de perguntas", () => {
  it("compradores tem o ciclo completo", () => {
    const p = META_PIPELINES.find((x) => x.key === "compradores")!;
    expect(p.stages).toContain("Negociação");
    expect(p.stages).toContain("Nutrição");
    expect(p.stages.length).toBeGreaterThanOrEqual(10);
  });
  it("recrutamento é um pipeline próprio", () => {
    const p = META_PIPELINES.find((x) => x.key === "recrutamento")!;
    expect(p.stages).toContain("Entrevista");
    expect(p.stages).toContain("Banco de talento");
  });
  it("deteta perguntas por mapear", () => {
    const form = leadFormById("form-1")!;
    const partial = { formId: "form-1", map: [{ questionKey: "full_name", leadField: "name" as const }] };
    const unmapped = detectUnmappedQuestions(form, partial);
    expect(unmapped.length).toBe(form.questions.length - 1);
    expect(detectUnmappedQuestions(form, fieldMappingForForm("form-1"))).toHaveLength(0);
  });
});

describe("relatório: recrutamento separado do comercial", () => {
  const now = new Date("2026-08-18T12:00:00Z").toISOString();
  const leads: Lead[] = [
    { id: "t1", ownerId: "carla", assignedAgentId: "carla", campaignId: "cmp-1", pipeline: "compradores", qualification: "qualificado", score: 80, name: "A", contact: "1", intent: "mensagem", source: "facebook", status: "novo", createdAt: now },
    { id: "t2", ownerId: "", unassigned: true, campaignId: "cmp-4", pipeline: "recrutamento", qualification: "novo", score: 40, name: "B", contact: "2", intent: "mensagem", source: "facebook", status: "novo", createdAt: now },
  ];
  const rep = buildMetaReport(leads, demoCampaigns);

  it("separa os segmentos", () => {
    expect(rep.commercial.total).toBe(1);
    expect(rep.recruitment.total).toBe(1);
    expect(rep.commercial.qualifiedRate).toBe(100);
  });
});

describe("SLA de 1.º contacto", () => {
  const old = new Date(Date.now() - 30 * 3_600_000).toISOString();
  const overdue: Lead = { id: "s1", ownerId: "rui", assignedAgentId: "rui", name: "C", contact: "3", intent: "mensagem", source: "facebook", status: "novo", createdAt: old };

  it("deteta atraso, ignora contactadas e sem-responsável", () => {
    expect(leadSlaOverdue(overdue)).toBe(true);
    expect(leadSlaOverdue({ ...overdue, id: "s2", status: "contactado" })).toBe(false);
    expect(leadSlaOverdue({ ...overdue, id: "s3", assignedAgentId: undefined, unassigned: true })).toBe(false);
    expect(automationSummary([overdue]).slaOverdue).toBe(1);
  });
});
