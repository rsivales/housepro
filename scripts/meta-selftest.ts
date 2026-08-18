/**
 * Auto-teste do módulo Meta CRM (lógica pura, sem BD nem rede).
 *
 * Valida o fluxo ponta-a-ponta em modo demo: normalização de respostas via
 * mapeamento → pontuação → construção da lead → atribuição pela regra →
 * relatório (comercial vs recrutamento) → SLA.
 *
 * Correr com:  npx tsx scripts/meta-selftest.ts
 * Sai com código 1 se algum invariante falhar (útil em CI leve).
 */

import {
  demoCampaigns,
  demoLeadForms,
  demoFieldMappings,
  demoAssignmentRules,
  campaignById,
  leadFormById,
  fieldMappingForForm,
} from "@/lib/data/meta";
import { normalizeAnswers, buildMetaLead, sampleAnswersForForm } from "@/lib/meta/ingest";
import { resolveAssignment } from "@/lib/meta/assignment";
import { scoreLead } from "@/lib/meta/scoring";
import { buildMetaReport } from "@/lib/meta/report";
import { automationSummary, leadSlaOverdue } from "@/lib/meta/automations";
import type { Lead } from "@/lib/data/leads";

let failures = 0;
function check(name: string, cond: boolean) {
  const ok = Boolean(cond);
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failures++;
}

// 1) Normalização via mapeamento (form-1: full_name→name, phone_number→contact)
{
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
  check("normaliza nome", norm.fields.name === "Maria Teste");
  check("normaliza contacto", norm.fields.contact === "351961234567");
  check("normaliza zona", norm.fields.zone === "Albufeira");
  check("guarda todas as respostas", norm.answers.length === raw.length);
  check("marca PII no contacto", norm.answers.find((a) => a.questionKey === "phone_number")?.pii === true);
}

// 2) Pontuação sobe com completude/intenção
{
  const magra = scoreLead({ contact: "" });
  const rica = scoreLead({
    contact: "351900000000",
    email: "x@y.pt",
    intent: "visita",
    budget: "+1M",
    zone: "Loulé",
    message: "Mensagem bem detalhada com bastante contexto.",
  });
  check("score de lead rica > lead magra", rica.score > magra.score);
  check("score dentro de 0–100", rica.score <= 100 && magra.score >= 0);
}

// 3) Construção da lead: nasce sem responsável, com origem comercial
{
  const campaign = campaignById("cmp-1")!;
  const form = leadFormById("form-1");
  const mapping = fieldMappingForForm("form-1");
  const norm = normalizeAnswers(sampleAnswersForForm(form!), form, mapping);
  const lead = buildMetaLead(campaign, form, norm);
  check("nasce sem responsável (inbox)", lead.unassigned === true);
  check("tem origem comercial", Boolean(lead.commercialOriginId));
  check("pipeline de compradores", lead.pipeline === "compradores");
  check("tem consentimento RGPD", Boolean(lead.consent?.base));
}

// 4) Atribuição por regra
{
  // round_robin (cmp-1): pool [carla, rui]
  const r1 = resolveAssignment({ campaign: campaignById("cmp-1")!, rule: demoAssignmentRules.find((r) => r.campaignId === "cmp-1") });
  check("round_robin atribui o 1.º do pool", r1.assignedAgentId === "carla" && r1.unassigned === false);
  check("round_robin avança o índice", r1.rrIndexNext === 1);

  // specific (cmp-2): sofia
  const r2 = resolveAssignment({ campaign: campaignById("cmp-2")!, rule: demoAssignmentRules.find((r) => r.campaignId === "cmp-2") });
  check("specific atribui o consultor", r2.assignedAgentId === "sofia");

  // property (cmp-3) sem angariador → inbox
  const r3 = resolveAssignment({ campaign: campaignById("cmp-3")!, rule: demoAssignmentRules.find((r) => r.campaignId === "cmp-3") });
  check("property sem angariador → inbox", r3.unassigned === true);
  // property com angariador → esse agente
  const r3b = resolveAssignment({ campaign: campaignById("cmp-3")!, rule: demoAssignmentRules.find((r) => r.campaignId === "cmp-3"), propertyOwnerId: "rui" });
  check("property com angariador → angariador", r3b.assignedAgentId === "rui");

  // recrutamento (cmp-4): unassigned
  const r4 = resolveAssignment({ campaign: campaignById("cmp-4")!, rule: demoAssignmentRules.find((r) => r.campaignId === "cmp-4") });
  check("recrutamento → inbox", r4.unassigned === true);
}

// 5) Relatório: recrutamento separado do comercial
{
  const now = new Date("2026-08-18T12:00:00Z");
  const leads: Lead[] = [
    { id: "t1", ownerId: "carla", assignedAgentId: "carla", campaignId: "cmp-1", pipeline: "compradores", qualification: "qualificado", score: 80, name: "A", contact: "1", intent: "mensagem", source: "facebook", status: "novo", createdAt: now.toISOString() },
    { id: "t2", ownerId: "", unassigned: true, campaignId: "cmp-4", pipeline: "recrutamento", qualification: "novo", score: 40, name: "B", contact: "2", intent: "mensagem", source: "facebook", status: "novo", createdAt: now.toISOString() },
  ];
  const rep = buildMetaReport(leads, demoCampaigns);
  check("comercial não inclui recrutamento", rep.commercial.total === 1);
  check("recrutamento contabilizado à parte", rep.recruitment.total === 1);
  check("taxa de qualificação comercial = 100%", rep.commercial.qualifiedRate === 100);
}

// 6) SLA de 1.º contacto
{
  const old = new Date(Date.now() - 30 * 3_600_000).toISOString(); // há 30h
  const overdue: Lead = { id: "s1", ownerId: "rui", assignedAgentId: "rui", name: "C", contact: "3", intent: "mensagem", source: "facebook", status: "novo", createdAt: old };
  const contacted: Lead = { ...overdue, id: "s2", status: "contactado" };
  const unassigned: Lead = { ...overdue, id: "s3", assignedAgentId: undefined, unassigned: true };
  check("lead atribuída e por contactar há 30h está em atraso", leadSlaOverdue(overdue) === true);
  check("lead já contactada não está em atraso", leadSlaOverdue(contacted) === false);
  check("lead sem responsável não conta para SLA do consultor", leadSlaOverdue(unassigned) === false);
  const sum = automationSummary([overdue, contacted, unassigned]);
  check("resumo conta 1 em atraso", sum.slaOverdue === 1);
}

console.log(
  failures === 0
    ? `\nTodos os testes passaram. (${demoCampaigns.length} campanhas, ${demoLeadForms.length} formulários, ${demoFieldMappings.length} mapeamentos demo)`
    : `\n${failures} teste(s) falharam.`
);
process.exit(failures === 0 ? 0 : 1);
