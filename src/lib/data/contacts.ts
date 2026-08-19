/**
 * Contactos — a entidade CENTRAL de pessoa no Helix, partilhada por todos os
 * módulos (leads, chamadas, emails, visitas, negócios). Junto vem a CRONOLOGIA
 * ÚNICA (`ContactActivity`), as tarefas e a agenda (visitas/eventos).
 *
 * Não duplica a `Lead`: uma lead liga-se a um contacto (leads.contact_id). A
 * cronologia agrega tudo o que acontece com a pessoa, de forma auditável.
 *
 * Como o resto da app, funciona em modo demo (mocks) sem Supabase.
 */

export type ContactType =
  | "comprador"
  | "vendedor"
  | "investidor"
  | "recrutamento"
  | "fornecedor"
  | "outro";

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  comprador: "Comprador",
  vendedor: "Proprietário / vendedor",
  investidor: "Investidor",
  recrutamento: "Recrutamento",
  fornecedor: "Fornecedor",
  outro: "Outro",
};

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  type: ContactType;
  /** Consultor responsável pelo contacto. */
  ownerId: string;
  agencyId?: string;
  zone?: string;
  budget?: string;
  language?: string;
  tags?: string[];
  /** Origem (site, facebook, referência, importado…). */
  source?: string;
  /** Consentimento/base legal (RGPD). */
  consent?: { base?: string; at?: string };
  createdAt: string;
  /** Momento da última atividade (para ordenar por "mais quente"). */
  lastActivityAt?: string;
}

// ── Cronologia única ───────────────────────────────────────────────────────

export type ActivityType =
  | "lead"
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "task"
  | "visit"
  | "stage"
  | "deal"
  | "document"
  | "system";

export type ActivityDirection = "in" | "out";

export interface ContactActivity {
  id: string;
  contactId: string;
  type: ActivityType;
  title: string;
  body?: string;
  actorId?: string;
  actorName?: string;
  direction?: ActivityDirection;
  /** Ligações opcionais à origem do evento. */
  leadId?: string;
  dealRef?: string;
  propertyRef?: string;
  at: string;
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  lead: "Lead",
  call: "Chamada",
  email: "Email",
  whatsapp: "WhatsApp",
  note: "Nota",
  task: "Tarefa",
  visit: "Visita",
  stage: "Mudança de fase",
  deal: "Negócio",
  document: "Documento",
  system: "Sistema",
};

/** Ordena a cronologia (mais recente primeiro). Função pura, testável. */
export function buildTimeline(activities: ContactActivity[]): ContactActivity[] {
  return [...activities].sort((a, b) => b.at.localeCompare(a.at));
}

/** Momento da última atividade de um contacto (para "mais quente"). */
export function lastActivityAt(activities: ContactActivity[]): string | undefined {
  return buildTimeline(activities)[0]?.at;
}

// ── Tarefas ────────────────────────────────────────────────────────────────

export type TaskKind = "call" | "visit" | "followup" | "email" | "doc" | "other";
export type TaskPriority = "baixa" | "normal" | "alta";

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  call: "Chamada",
  visit: "Visita",
  followup: "Seguimento",
  email: "Email",
  doc: "Documento",
  other: "Outro",
};

export interface Task {
  id: string;
  ownerId: string;
  contactId?: string;
  contactName?: string;
  title: string;
  kind: TaskKind;
  priority: TaskPriority;
  dueAt?: string;
  done: boolean;
  createdAt: string;
}

// ── Agenda (visitas / eventos) ───────────────────────────────────────────────

export type VisitKind = "visita" | "reuniao" | "avaliacao" | "outro";
export type VisitStatus = "agendada" | "feita" | "cancelada" | "noshow";

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  agendada: "Agendada",
  feita: "Realizada",
  cancelada: "Cancelada",
  noshow: "Faltou",
};

export interface Visit {
  id: string;
  ownerId: string;
  contactId?: string;
  contactName?: string;
  propertyId?: string;
  propertyRef?: string;
  kind: VisitKind;
  at: string;
  durationMin?: number;
  status: VisitStatus;
  note?: string;
}

// ── Dados de exemplo (modo demo) ─────────────────────────────────────────────

export const demoContacts: Contact[] = [
  {
    id: "ct-1",
    name: "Helena Dias",
    phone: "351962111222",
    email: "helena.dias@email.pt",
    type: "comprador",
    ownerId: "carla",
    agencyId: "algarve",
    zone: "Albufeira",
    budget: "250k–500k",
    tags: ["meta", "quente"],
    source: "facebook",
    consent: { base: "consentimento", at: "2026-08-15T10:00:00" },
    createdAt: "2026-08-15T10:00:00",
    lastActivityAt: "2026-08-16T09:00:00",
  },
  {
    id: "ct-2",
    name: "António Reis",
    phone: "351911777333",
    type: "vendedor",
    ownerId: "sofia",
    agencyId: "cascais",
    zone: "Cascais",
    tags: ["angariação"],
    source: "instagram",
    createdAt: "2026-08-14T15:30:00",
    lastActivityAt: "2026-08-17T11:20:00",
  },
  {
    id: "ct-3",
    name: "Family Oliveira",
    phone: "351915333444",
    type: "investidor",
    ownerId: "rui",
    agencyId: "porto",
    zone: "Loulé",
    budget: "+1M",
    tags: ["luxo"],
    source: "facebook",
    createdAt: "2026-08-12T18:00:00",
    lastActivityAt: "2026-08-18T10:00:00",
  },
];

export const demoContactActivities: ContactActivity[] = [
  { id: "a1", contactId: "ct-1", type: "lead", title: "Lead recebida via Meta", body: "Compradores Algarve — Verão", leadId: "ml-1", at: "2026-08-15T10:00:00" },
  { id: "a2", contactId: "ct-1", type: "call", title: "Chamada de 1.º contacto", body: "Interessada em T2/T3, orçamento 250k–500k.", direction: "out", actorId: "carla", actorName: "Carla Sousa", at: "2026-08-15T16:30:00" },
  { id: "a3", contactId: "ct-1", type: "note", title: "Nota", body: "Prefere andar alto e vista mar.", actorId: "carla", actorName: "Carla Sousa", at: "2026-08-16T09:00:00" },
  { id: "a4", contactId: "ct-2", type: "lead", title: "Lead recebida via Meta", body: "Angariação Cascais", leadId: "ml-2", at: "2026-08-14T15:30:00" },
  { id: "a5", contactId: "ct-2", type: "visit", title: "Avaliação agendada", body: "Moradia T4 em Cascais.", at: "2026-08-17T11:20:00" },
  { id: "a6", contactId: "ct-3", type: "visit", title: "Visita à moradia HP-1048", propertyRef: "HP-1048", at: "2026-08-18T10:00:00" },
];

export const demoTasks: Task[] = [
  { id: "tk-1", ownerId: "carla", contactId: "ct-1", contactName: "Helena Dias", title: "Enviar 3 imóveis a Albufeira", kind: "followup", priority: "alta", dueAt: "2026-08-19T12:00:00", done: false, createdAt: "2026-08-16T09:05:00" },
  { id: "tk-2", ownerId: "rui", contactId: "ct-3", contactName: "Family Oliveira", title: "Confirmar visita de 22/08", kind: "visit", priority: "normal", dueAt: "2026-08-20T10:00:00", done: false, createdAt: "2026-08-18T10:05:00" },
  { id: "tk-3", ownerId: "sofia", contactId: "ct-2", contactName: "António Reis", title: "Preparar proposta de serviço", kind: "doc", priority: "normal", dueAt: "2026-08-21T09:00:00", done: false, createdAt: "2026-08-17T11:25:00" },
];

export const demoVisits: Visit[] = [
  { id: "vs-1", ownerId: "rui", contactId: "ct-3", contactName: "Family Oliveira", propertyId: "7", propertyRef: "HP-1048", kind: "visita", at: "2026-08-22T11:00:00", durationMin: 45, status: "agendada" },
  { id: "vs-2", ownerId: "sofia", contactId: "ct-2", contactName: "António Reis", kind: "avaliacao", at: "2026-08-20T15:00:00", durationMin: 60, status: "agendada", note: "Avaliação da moradia para angariação." },
];

// Helpers de consulta (modo demo) -------------------------------------------

export const contactById = (id: string): Contact | undefined =>
  demoContacts.find((c) => c.id === id);

export const contactsByOwner = (ownerId: string): Contact[] =>
  demoContacts
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => (b.lastActivityAt ?? b.createdAt).localeCompare(a.lastActivityAt ?? a.createdAt));

export const activitiesForContact = (contactId: string): ContactActivity[] =>
  buildTimeline(demoContactActivities.filter((a) => a.contactId === contactId));

export const tasksByOwner = (ownerId: string): Task[] =>
  demoTasks
    .filter((t) => t.ownerId === ownerId)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

export const visitsByOwner = (ownerId: string): Visit[] =>
  demoVisits
    .filter((v) => v.ownerId === ownerId)
    .sort((a, b) => a.at.localeCompare(b.at));
