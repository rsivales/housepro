import "server-only";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { notifyGeneric } from "@/lib/notify";
import { remainingTime, PRE_ESCRITURA_MILESTONES_DAYS } from "@/lib/helix/transaction-indicators";

interface DealRow {
  id: string;
  agency_id: string;
  stage: string;
  escritura_at: string | null;
  deadline_version: number;
  transaction_manager_id: string | null;
  coordenador_id: string | null;
  consultor_comprador_id: string | null;
  angariador_id: string | null;
}
interface TaskRow {
  deal_id: string;
  status: string;
  critical: boolean;
  applicability: string;
}

const MESSAGE: Record<number, string> = {
  7: "Faltam 7 dias para a escritura. A validação pré-escritura foi iniciada — confirme as tarefas pendentes no Helix.",
  5: "Faltam 5 dias para a escritura e há pendências por validar. Por favor atualize o ponto de situação.",
  3: "Faltam apenas 3 dias para a escritura com tarefas críticas por validar. Ação urgente necessária.",
  2: "Faltam 48 horas para a escritura e continuam pendências críticas. A direção da agência foi notificada.",
  1: "Falta 1 dia para a escritura. Alerta máximo: confirme hoje que todas as tarefas vitais estão validadas.",
};

/** Negócios com tarefas críticas por validar e escritura marcada são sempre
 *  escalados, independentemente do dia exato — isto permite o cron diário
 *  apanhar negócios que só agora entraram em atraso, sem exigir uma corrida
 *  exata ao minuto do prazo. */
export async function runTransactionAlerts(now = new Date()): Promise<{
  evaluated: number;
  dispatched: number;
}> {
  if (!hasServiceRole()) return { evaluated: 0, dispatched: 0 };
  const sb = createAdminClient();
  const { data: deals, error } = await sb
    .from("deals")
    .select(
      "id, agency_id, stage, escritura_at, deadline_version, transaction_manager_id, coordenador_id, consultor_comprador_id, angariador_id",
    )
    .not("escritura_at", "is", null)
    .not("stage", "in", '("concluido","cancelado")');
  if (error || !deals?.length) return { evaluated: 0, dispatched: 0 };
  const rows = deals as DealRow[];

  const { data: taskRows } = await sb
    .from("deal_tasks")
    .select("deal_id, status, critical, applicability")
    .in("deal_id", rows.map((d) => d.id));
  const tasksByDeal = new Map<string, TaskRow[]>();
  for (const t of (taskRows ?? []) as TaskRow[]) {
    const list = tasksByDeal.get(t.deal_id) ?? [];
    list.push(t);
    tasksByDeal.set(t.deal_id, list);
  }

  const brokerByAgency = new Map<string, string>();
  const { data: finance } = await sb
    .from("agency_finance_settings")
    .select("agency_id, broker_id")
    .in("agency_id", [...new Set(rows.map((d) => d.agency_id))]);
  for (const f of finance ?? []) brokerByAgency.set(f.agency_id, f.broker_id);

  let dispatched = 0;
  for (const deal of rows) {
    const tasks = (tasksByDeal.get(deal.id) ?? []).filter(
      (t) => t.applicability !== "not_applicable",
    );
    const outstanding = tasks.filter(
      (t) => !["validated", "waived"].includes(t.status),
    );
    if (outstanding.length === 0) continue; // Tudo validado: "Pronto para escritura", sem alarme.
    const criticalOutstanding = outstanding.filter((t) => t.critical).length;

    const remaining = remainingTime(deal.escritura_at, now);
    if (!remaining) continue;

    let milestoneDays: number | null = null;
    let obligationSuffix = "";
    if (remaining.expired) {
      // Incumprimento: reenvia todos os dias em atraso até reagendar/validar.
      milestoneDays = -remaining.days - 1;
      obligationSuffix = "vencido";
    } else if (
      (PRE_ESCRITURA_MILESTONES_DAYS as readonly number[]).includes(
        remaining.days,
      ) &&
      remaining.days > 0
    ) {
      milestoneDays = remaining.days;
    }
    if (milestoneDays === null) continue;

    const recipients = new Set<string>();
    if (deal.transaction_manager_id) recipients.add(deal.transaction_manager_id);
    if (deal.coordenador_id) recipients.add(deal.coordenador_id);
    if (milestoneDays <= 3 || obligationSuffix === "vencido") {
      if (deal.consultor_comprador_id) recipients.add(deal.consultor_comprador_id);
      else if (deal.angariador_id) recipients.add(deal.angariador_id);
    }
    if (milestoneDays <= 2 && criticalOutstanding > 0) {
      const broker = brokerByAgency.get(deal.agency_id);
      if (broker) recipients.add(broker);
    }
    if (recipients.size === 0) continue;

    const subject = remaining.expired
      ? `Escritura em atraso — ${outstanding.length} tarefa(s) por validar`
      : `Escritura em ${remaining.days}d ${remaining.remainderHours}h — ${outstanding.length} tarefa(s) por validar`;
    const text = remaining.expired
      ? `A data da escritura já passou e ainda há ${outstanding.length} tarefa(s) por validar (${criticalOutstanding} crítica(s)). Confirme o incumprimento ou reagende a escritura no Helix.`
      : (MESSAGE[milestoneDays] ??
          `Faltam ${remaining.days} dias para a escritura e há ${outstanding.length} tarefa(s) por validar.`);

    for (const recipientId of recipients) {
      const { error: dispatchError } = await sb
        .from("deal_alert_dispatches")
        .insert({
          deal_id: deal.id,
          obligation_code: `pre_escritura${obligationSuffix ? `_${obligationSuffix}` : ""}`,
          deadline_version: deal.deadline_version,
          milestone_days: milestoneDays,
          channel: "email",
          recipient_id: recipientId,
        });
      if (dispatchError) continue; // já disparado para este marco/versão — dedupe.
      await notifyGeneric({
        subject,
        text,
        agentId: recipientId,
        privateReport: true,
      });
      dispatched++;
    }
  }
  return { evaluated: rows.length, dispatched };
}
