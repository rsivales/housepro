import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export type TaskPhase =
  | "pre_cpcv"
  | "post_cpcv"
  | "pre_escritura"
  | "post_escritura"
  | "credito";
export type TaskAudience = "internal" | "buyer" | "seller";
export type TaskApplicability = "required" | "optional" | "not_applicable";
export type TaskStatus =
  | "pending"
  | "requested"
  | "received"
  | "in_review"
  | "validated"
  | "rejected"
  | "waived";

export interface DealTask {
  id: string;
  dealId: string;
  code: string;
  title: string;
  phase: TaskPhase;
  audience: TaskAudience;
  applicability: TaskApplicability;
  status: TaskStatus;
  critical: boolean;
  ownerId: string | null;
  dueAt: string | null;
  evidenceDocumentId: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  waiverReason: string | null;
  updatedAt: string;
}

interface TaskRow {
  id: string;
  deal_id: string;
  code: string;
  title: string;
  phase: string;
  audience: string;
  applicability: string;
  status: string;
  critical: boolean;
  owner_id: string | null;
  due_at: string | null;
  evidence_document_id: string | null;
  validated_by: string | null;
  validated_at: string | null;
  waiver_reason: string | null;
  updated_at: string;
}

function mapTask(r: TaskRow): DealTask {
  return {
    id: r.id,
    dealId: r.deal_id,
    code: r.code,
    title: r.title,
    phase: r.phase as TaskPhase,
    audience: r.audience as TaskAudience,
    applicability: r.applicability as TaskApplicability,
    status: r.status as TaskStatus,
    critical: Boolean(r.critical),
    ownerId: r.owner_id,
    dueAt: r.due_at,
    evidenceDocumentId: r.evidence_document_id,
    validatedBy: r.validated_by,
    validatedAt: r.validated_at,
    waiverReason: r.waiver_reason,
    updatedAt: r.updated_at,
  };
}

const TASK_COLS =
  "id, deal_id, code, title, phase, audience, applicability, status, critical, owner_id, due_at, evidence_document_id, validated_by, validated_at, waiver_reason, updated_at";

/** Checklist condicional por defeito — ver docs/helix/MANUAL_TECNICO_BRAND.md.
 *  "optional" fica ao critério da gestora processual marcar not_applicable
 *  (ex.: vendedor sem hipoteca, comprador sem crédito). */
export const DEFAULT_TASK_TEMPLATE: {
  code: string;
  title: string;
  phase: TaskPhase;
  audience: TaskAudience;
  applicability: TaskApplicability;
  critical: boolean;
}[] = [
  // Documentação do imóvel — necessária antes do CPCV
  { code: "caderneta_predial", title: "Caderneta predial atualizada", phase: "pre_cpcv", audience: "internal", applicability: "required", critical: true },
  { code: "certidao_permanente", title: "Certidão permanente do registo predial", phase: "pre_cpcv", audience: "internal", applicability: "required", critical: true },
  { code: "cert_energetico", title: "Certificado energético válido", phase: "pre_cpcv", audience: "internal", applicability: "required", critical: true },
  { code: "licenca_utilizacao", title: "Licença de utilização", phase: "pre_cpcv", audience: "internal", applicability: "required", critical: true },
  { code: "imi_condominio_ok", title: "IMI e condomínio sem dívidas", phase: "pre_cpcv", audience: "internal", applicability: "required", critical: false },
  // Crédito bancário — comprador acompanha, só o profissional confirma aprovação
  { code: "credito_pedido", title: "Pedido de crédito submetido ao banco", phase: "credito", audience: "buyer", applicability: "optional", critical: false },
  { code: "credito_avaliacao", title: "Avaliação bancária do imóvel", phase: "credito", audience: "buyer", applicability: "optional", critical: true },
  { code: "credito_aprovacao", title: "Aprovação de crédito confirmada", phase: "credito", audience: "buyer", applicability: "optional", critical: true },
  // Entre CPCV e escritura — distrate e declarações do lado do vendedor
  { code: "distrate_hipoteca", title: "Distrate / cancelamento de hipoteca", phase: "post_cpcv", audience: "seller", applicability: "optional", critical: true },
  { code: "declaracao_condominio", title: "Declaração de condomínio sem dívidas", phase: "post_cpcv", audience: "seller", applicability: "optional", critical: false },
  // Controlo pré-escritura — a contagem regressiva dos 7 dias
  { code: "data_escritura_agendada", title: "Data e hora da escritura agendadas", phase: "pre_escritura", audience: "internal", applicability: "required", critical: true },
  { code: "cartorio_confirmado", title: "Cartório / notário confirmado", phase: "pre_escritura", audience: "internal", applicability: "required", critical: true },
  { code: "imt_selo_pagos", title: "IMT e Imposto de Selo pagos", phase: "pre_escritura", audience: "internal", applicability: "required", critical: true },
  { code: "forma_pagamento", title: "Forma de pagamento do remanescente confirmada", phase: "pre_escritura", audience: "internal", applicability: "required", critical: true },
  { code: "minuta_revista", title: "Minuta revista por todas as partes", phase: "pre_escritura", audience: "internal", applicability: "required", critical: false },
  // Pós-escritura
  { code: "entrega_chaves", title: "Entrega de chaves", phase: "post_escritura", audience: "internal", applicability: "required", critical: true },
  { code: "registo_predial_submetido", title: "Registo predial submetido", phase: "post_escritura", audience: "internal", applicability: "required", critical: false },
  { code: "copia_escritura_cliente", title: "Cópia da escritura entregue ao cliente", phase: "post_escritura", audience: "buyer", applicability: "required", critical: false },
];

/** Tarefas de um negócio (ordenadas por fase/prazo). */
export async function listDealTasks(dealId: string): Promise<DealTask[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deal_tasks")
    .select(TASK_COLS)
    .eq("deal_id", dealId)
    .order("phase")
    .order("due_at", { nullsFirst: false });
  if (error || !data) return [];
  return (data as TaskRow[]).map(mapTask);
}

/** Tarefas de vários negócios de uma vez (painel da gestão processual). */
export async function listDealTasksForDeals(
  dealIds: string[],
): Promise<Map<string, DealTask[]>> {
  const out = new Map<string, DealTask[]>();
  if (!hasServiceRole() || dealIds.length === 0) return out;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deal_tasks")
    .select(TASK_COLS)
    .in("deal_id", dealIds);
  if (error || !data) return out;
  for (const row of data as TaskRow[]) {
    const task = mapTask(row);
    const list = out.get(task.dealId) ?? [];
    list.push(task);
    out.set(task.dealId, list);
  }
  return out;
}

/** Aplica a checklist padrão a um negócio — idempotente (não duplica por
 *  código já existente). Usar quando o negócio entra em reserva/CPCV ou por
 *  ação manual da gestão processual. */
export async function seedDealTasks(
  dealId: string,
): Promise<{ created: number } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data: deal } = await sb
    .from("deals")
    .select("escritura_at, cpcv_deadline_at")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "not_found" };
  const rows = DEFAULT_TASK_TEMPLATE.map((t) => ({
    deal_id: dealId,
    code: t.code,
    title: t.title,
    phase: t.phase,
    audience: t.audience,
    applicability: t.applicability,
    critical: t.critical,
    due_at:
      t.phase === "pre_escritura"
        ? deal.escritura_at
        : t.phase === "pre_cpcv"
          ? deal.cpcv_deadline_at
          : null,
  }));
  const { data, error } = await sb
    .from("deal_tasks")
    .upsert(rows, { onConflict: "deal_id,code", ignoreDuplicates: true })
    .select("id");
  if (error) return { error: error.message };
  return { created: data?.length ?? 0 };
}

/** Atribui/edita a gestora processual do negócio. */
export async function setTransactionManager(
  dealId: string,
  transactionManagerId: string | null,
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { error } = await sb
    .from("deals")
    .update({ transaction_manager_id: transactionManagerId })
    .eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Define/edita os prazos de CPCV e escritura. O trigger na base de dados
 *  avança deadline_version e realinha as tarefas da fase correspondente. */
export async function setDealDeadlines(
  dealId: string,
  patch: { escrituraAt?: string | null; cpcvDeadlineAt?: string | null },
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const dbPatch: Record<string, unknown> = {};
  if ("escrituraAt" in patch) dbPatch.escritura_at = patch.escrituraAt || null;
  if ("cpcvDeadlineAt" in patch)
    dbPatch.cpcv_deadline_at = patch.cpcvDeadlineAt || null;
  if (Object.keys(dbPatch).length === 0) return { ok: true };
  const { error } = await sb.from("deals").update(dbPatch).eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Atualiza o estado de uma tarefa (validar/rejeitar/dispensar/pedir/receber).
 *  actorId só para o histórico — a autorização é feita na rota da API,
 *  igual ao resto do CRM (o cliente de serviço ignora RLS). */
export async function updateDealTaskStatus(
  taskId: string,
  actorId: string,
  patch: {
    status: TaskStatus;
    waiverReason?: string;
    evidenceDocumentId?: string | null;
    dueAt?: string | null;
    ownerId?: string | null;
  },
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  if (patch.status === "waived" && !patch.waiverReason?.trim())
    return { error: "waiver_reason_required" };
  const sb = createAdminClient();
  const dbPatch: Record<string, unknown> = {
    status: patch.status,
    updated_at: new Date().toISOString(),
  };
  if (patch.status === "validated") {
    dbPatch.validated_by = actorId;
    dbPatch.validated_at = new Date().toISOString();
  }
  if (patch.status === "waived") dbPatch.waiver_reason = patch.waiverReason;
  if ("evidenceDocumentId" in patch)
    dbPatch.evidence_document_id = patch.evidenceDocumentId;
  if ("dueAt" in patch) dbPatch.due_at = patch.dueAt;
  if ("ownerId" in patch) dbPatch.owner_id = patch.ownerId;
  const { error } = await sb.from("deal_tasks").update(dbPatch).eq("id", taskId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Candidatos a gestor processual: coordenação/direção/administração da
 *  agência do negócio (ou da rede, para administração/superadmin). */
export async function listTransactionManagerCandidates(
  agencyId: string,
): Promise<{ id: string; name: string }[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("profiles")
    .select("id, name, role_key, agency_id")
    .eq("active", true)
    .in("role_key", ["coordenador", "diretor", "admin", "superadmin"])
    .or(`agency_id.eq.${agencyId},role_key.eq.admin,role_key.eq.superadmin`)
    .order("name");
  if (error || !data) return [];
  return data.map((p) => ({ id: String(p.id), name: p.name ?? "—" }));
}

/** Negócio a que pertence uma tarefa — para o gate de permissão na rota. */
export async function getTaskDealId(taskId: string): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("deal_tasks")
    .select("deal_id")
    .eq("id", taskId)
    .maybeSingle();
  return data?.deal_id ?? null;
}

/** Tarefas de um negócio visíveis a uma das partes — nunca tarefas internas. */
export async function listClientDealTasks(
  dealId: string,
  audience: "buyer" | "seller",
): Promise<DealTask[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("deal_tasks")
    .select(TASK_COLS)
    .eq("deal_id", dealId)
    .eq("audience", audience)
    .neq("applicability", "not_applicable")
    .order("due_at", { nullsFirst: false });
  if (error || !data) return [];
  return (data as TaskRow[]).map(mapTask);
}

interface ClientTaskGate {
  dealId: string;
  audience: TaskAudience;
}

/** Confirma que a tarefa é do comprador e pertence ao negócio ligado a este
 *  contacto — nunca confia no dealId que o cliente possa enviar. */
export async function verifyBuyerTaskAccess(
  taskId: string,
  buyerContactId: string,
): Promise<ClientTaskGate | null> {
  if (!hasServiceRole() || !buyerContactId) return null;
  const sb = createAdminClient();
  const { data: task } = await sb
    .from("deal_tasks")
    .select("deal_id, audience")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.audience !== "buyer") return null;
  const { data: deal } = await sb
    .from("deals")
    .select("id")
    .eq("id", task.deal_id)
    .eq("buyer_contact_id", buyerContactId)
    .maybeSingle();
  if (!deal) return null;
  return { dealId: task.deal_id, audience: "buyer" };
}

/** Confirma que a tarefa é do vendedor e que o email verificado é o do
 *  proprietário do imóvel ligado a este negócio (mesmo mecanismo do portal
 *  do proprietário — sem conta/contacto próprio, só email verificado). */
export async function verifySellerTaskAccess(
  taskId: string,
  ownerEmail: string,
): Promise<ClientTaskGate | null> {
  if (!hasServiceRole() || !ownerEmail.trim()) return null;
  const sb = createAdminClient();
  const { data: task } = await sb
    .from("deal_tasks")
    .select("deal_id, audience")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.audience !== "seller") return null;
  const { data: deal } = await sb
    .from("deals")
    .select("id, property:properties!property_id(owner_email)")
    .eq("id", task.deal_id)
    .maybeSingle();
  const p = Array.isArray(deal?.property) ? deal.property[0] : deal?.property;
  if (!deal || String(p?.owner_email ?? "").toLowerCase() !== ownerEmail.trim().toLowerCase())
    return null;
  return { dealId: task.deal_id, audience: "seller" };
}

const DOC_KIND_BY_CODE: Record<string, string> = {
  credito_aprovacao: "aprovacao_credito",
  credito_avaliacao: "avaliacao_banco",
  cert_energetico: "cert_energetico",
  caderneta_predial: "caderneta",
};

/** Regista o documento carregado pelo cliente: cria o deal_documents (audiência
 *  = a da tarefa) e passa a tarefa para 'received' — nunca 'validated'. Só um
 *  profissional autorizado confirma a validação (ver updateDealTaskStatus). */
export async function recordClientTaskUpload(
  taskId: string,
  dealId: string,
  audience: TaskAudience,
  storagePath: string,
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { data: task } = await sb
    .from("deal_tasks")
    .select("code")
    .eq("id", taskId)
    .maybeSingle();
  const { data: doc, error: docError } = await sb
    .from("deal_documents")
    .insert({
      deal_id: dealId,
      kind: DOC_KIND_BY_CODE[task?.code ?? ""] ?? "outro",
      url: storagePath,
      audience,
      task_id: taskId,
    })
    .select("id")
    .single();
  if (docError || !doc) return { error: docError?.message ?? "upload_failed" };
  const { error } = await sb
    .from("deal_tasks")
    .update({
      status: "received",
      evidence_document_id: doc.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (error) return { error: error.message };
  return { ok: true };
}
