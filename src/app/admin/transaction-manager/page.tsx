import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, ClipboardList, UserRound } from "lucide-react";

import { CREDIT_STEPS, DEAL_STEPS, type CreditStage, type DealStage } from "@/lib/data/deal";
import { isStaff } from "@/lib/data/roles";
import { agendaPriority, compareAgendaActions, getAgendaAction, type AgendaAction, type AgendaTask } from "@/lib/helix/transaction-agenda";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Gestão processual — Helix" };
export const dynamic = "force-dynamic";

type DealRow = {
  id: string;
  stage: DealStage;
  credit_stage: CreditStage;
  escritura_at: string | null;
  cpcv_deadline_at: string | null;
  transaction_manager_id: string | null;
  coordenador_id: string | null;
  consultor_comprador_id: string | null;
  angariador_id: string | null;
  property: { reference: string; title: string } | null;
};
type TaskRow = Omit<AgendaTask, "dueAt" | "ownerId"> & { deal_id: string; due_at: string | null; owner_id: string | null };

type AgendaRow = { deal: DealRow; action: AgendaAction };

const groups = [
  { label: "Em atraso", color: "text-destructive" },
  { label: "Hoje", color: "text-primary" },
  { label: "Próximos 7 dias", color: "text-foreground" },
  { label: "Mais tarde", color: "text-foreground" },
  { label: "Sem prazo definido", color: "text-muted-foreground" },
];

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon",
});

function AgendaCard({ deal, action, names, priority }: AgendaRow & { names: Map<string, string>; priority: number }) {
  const href = `/app/crm/${deal.id}${action.taskId ? `#tarefa-${action.taskId}` : ""}`;
  const stage = DEAL_STEPS.find((item) => item.stage === deal.stage)?.label;
  const credit = CREDIT_STEPS.find((item) => item.stage === deal.credit_stage)?.label;
  const reference = deal.property?.reference || deal.id.slice(0, 8).toUpperCase();
  const responsible = action.responsible && names.get(action.responsible.id);
  return (
    <li>
      <Link href={href} className="group block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{reference}{deal.property?.title && ` · ${deal.property.title}`}</p>
            <h3 className="mt-1 font-semibold leading-snug group-hover:text-primary">{action.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{[stage, credit && (deal.credit_stage === "escritura_marcada" ? credit : `Crédito · ${credit}`)].filter(Boolean).join(" · ")}</p>
            {action.detail && <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>}
          </div>
          <div className="flex items-start gap-2">
            <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{responsible || (action.responsible ? "Nome indisponível" : "Por atribuir")}</p>
              <p className="text-xs text-muted-foreground">{action.responsible?.role ?? "Responsável"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className={cn("text-sm font-medium tabular-nums", priority === 0 && "text-destructive")}>
                {action.deadline ? <time dateTime={action.deadline.at}>{dateFormat.format(new Date(action.deadline.at))}</time> : "Por definir"}
              </p>
              <p className="text-xs text-muted-foreground">{action.deadline?.label ?? "Prazo da ação"}</p>
              {deal.escritura_at && action.deadline?.at !== deal.escritura_at && (
                <p className="mt-1 text-xs text-muted-foreground">Escritura <time dateTime={deal.escritura_at}>{dateFormat.format(new Date(deal.escritura_at))}</time></p>
              )}
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="hidden size-4 text-muted-foreground group-hover:text-primary sm:block" />
        </div>
      </Link>
    </li>
  );
}

export default async function TransactionManagerPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isStaff(session.agent)) redirect("/app");
  const profile = session.agent;
  const global = ["superadmin", "admin"].includes(profile.roleKey ?? profile.role);

  let unavailable = session.demo || !hasServiceRole();
  let checklistUnavailable = false;
  const rows: AgendaRow[] = [];
  const names = new Map<string, string>();
  const now = Date.now();

  if (!unavailable && (global || profile.agencyId)) {
    const db = createAdminClient();
    const pageSize = 50;
    const deals: DealRow[] = [];
    const tasksByDeal = new Map<string, AgendaTask[]>();

    for (let offset = 0; ; offset += pageSize) {
      let query = db.from("deals")
        .select("id,stage,credit_stage,escritura_at,cpcv_deadline_at,transaction_manager_id,coordenador_id,consultor_comprador_id,angariador_id,property:properties!property_id(reference,title)")
        .not("stage", "in", "(concluido,cancelado)");
      // Same agency scope as the CRM. The session profile also reflects “Ver como”.
      if (!global) query = query.eq("agency_id", profile.agencyId);
      const result = await query.order("id").range(offset, offset + pageSize - 1);
      if (result.error) {
        unavailable = true;
        break;
      }
      deals.push(...result.data as unknown as DealRow[]);
      if (result.data.length < pageSize) break;
    }

    for (let start = 0; !unavailable && start < deals.length; start += pageSize) {
      const ids = deals.slice(start, start + pageSize).map((deal) => deal.id);
      const taskPageSize = 500;
      for (let offset = 0; ; offset += taskPageSize) {
        const result = await db.from("deal_tasks")
          .select("id,deal_id,code,title,phase,audience,applicability,status,critical,owner_id,due_at")
          .in("deal_id", ids).order("id").range(offset, offset + taskPageSize - 1);
        if (result.error) {
          checklistUnavailable = true;
          tasksByDeal.clear();
          break;
        }
        for (const { deal_id, due_at, owner_id, ...task } of result.data as TaskRow[]) {
          const list = tasksByDeal.get(deal_id) ?? [];
          list.push({ ...task, dueAt: due_at, ownerId: owner_id });
          tasksByDeal.set(deal_id, list);
        }
        if (result.data.length < taskPageSize) break;
      }
      if (checklistUnavailable) break;
    }

    if (!unavailable) {
      for (const deal of deals) {
        const action = getAgendaAction({
          stage: deal.stage, creditStage: deal.credit_stage, escrituraAt: deal.escritura_at,
          cpcvDeadlineAt: deal.cpcv_deadline_at, managerId: deal.transaction_manager_id,
          coordinatorId: deal.coordenador_id, buyerAgentId: deal.consultor_comprador_id,
          listingAgentId: deal.angariador_id,
        }, tasksByDeal.get(deal.id) ?? [], now);
        rows.push({ deal, action });
      }
      const profileIds = Array.from(new Set(rows.flatMap(({ action }) => action.responsible ? [action.responsible.id] : [])));
      for (let start = 0; start < profileIds.length; start += pageSize) {
        const { data } = await db.from("profiles").select("id,name").in("id", profileIds.slice(start, start + pageSize));
        for (const item of data ?? []) if (item.name) names.set(item.id, item.name);
      }
      rows.sort((a, b) => compareAgendaActions(a.action, b.action, now));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground hover:underline">← Administração</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Gestão processual</h1>
      <p className="mt-2 text-sm text-muted-foreground">A próxima ação de cada negócio, quem a tem a cargo e até quando.</p>

      {unavailable ? (
        <p role="status" className="mt-6 rounded-xl border p-5 text-sm text-muted-foreground">De momento, não é possível consultar os negócios.</p>
      ) : (
        <>
          {checklistUnavailable && <p role="status" className="mt-6 rounded-xl border p-4 text-sm text-muted-foreground">Não foi possível carregar as tarefas. As ações apresentadas baseiam-se na fase e nos prazos de cada negócio.</p>}
          {rows.length === 0 && <p className="mt-6 rounded-xl border p-5 text-sm text-muted-foreground">Não existem negócios em curso neste perfil.</p>}
          {groups.map((group, priority) => {
            const items = rows.filter(({ action }) => agendaPriority(action.deadline, now) === priority);
            if (items.length === 0) return null;
            return (
              <section key={group.label} aria-labelledby={`agenda-${priority}`} className="mt-7">
                <h2 id={`agenda-${priority}`} className={cn("flex items-center gap-2 text-sm font-semibold", group.color)}>
                  <ClipboardList aria-hidden="true" className="size-4" />
                  {group.label} <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {items.map((row) => <AgendaCard key={row.deal.id} {...row} names={names} priority={priority} />)}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
