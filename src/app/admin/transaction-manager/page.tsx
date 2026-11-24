import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/data/roles";
import { deadlineUrgency, remainingTime } from "@/lib/helix/transaction-indicators";

export const metadata = { title: "Gestão processual — Helix" };
export const dynamic = "force-dynamic";

type DealRow = {
  id: string;
  stage: string;
  credit_stage: string;
  amount: number | null;
  created_at: string;
  escritura_at: string | null;
  cpcv_deadline_at: string | null;
  transaction_manager_id: string | null;
};
type TaskRow = { deal_id: string; status: string; critical: boolean; applicability: string };

export default async function TransactionManagerPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isStaff(session.agent)) redirect("/app");
  if (session.demo) return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-semibold">Gestão processual</h1><p className="mt-2 text-muted-foreground">Disponível apenas com sessão e dados reais.</p></main>;
  const db = await createClient();
  const dealsResult = await db.from("deals")
    .select("id,stage,credit_stage,amount,created_at,escritura_at,cpcv_deadline_at,transaction_manager_id")
    .not("stage","in",'("concluido","cancelado")')
    .order("created_at",{ascending:false}).limit(100);
  if (dealsResult.error) {
    return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-semibold">Gestão processual</h1><p className="mt-3 text-sm text-destructive">Não foi possível consultar os processos. Confirme a migração e as permissões antes de utilizar este painel.</p></main>;
  }
  const deals = (dealsResult.data ?? []) as DealRow[];
  const tasksResult = deals.length ? await db.from("deal_tasks")
    .select("deal_id,status,critical,applicability").in("deal_id",deals.map(d=>d.id)) : {data:[],error:null};
  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const taskDataReady = !tasksResult.error;
  const open = (d:DealRow) => tasks.filter(t=>t.deal_id===d.id && t.applicability!=="not_applicable" && !["validated","waived"].includes(t.status));
  const stats = { total:deals.length, withManager:deals.filter(d=>d.transaction_manager_id).length,
    urgent:taskDataReady?deals.filter(d=>["critico","urgente","vencido"].includes(deadlineUrgency(d.escritura_at,open(d).filter(t=>t.critical).length,open(d).length))).length:null };
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <p className="text-sm font-medium text-primary">Helix · Gestão de processos</p>
    <h1 className="mt-1 text-3xl font-semibold">Transaction Manager</h1>
    <p className="mt-2 text-sm text-muted-foreground">Processos acessíveis ao seu perfil, sujeitos às permissões da base de dados. Ações de gestão e notificações serão ativadas após validação.</p>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[["Negócios em curso",stats.total],["Com gestor atribuído",stats.withManager],["Urgentes",stats.urgent??"—"]].map(([label,value])=>
        <div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}
    </div>
    {!taskDataReady && <p className="mt-5 rounded-lg border p-3 text-sm text-amber-700">Checklist indisponível: confirmar migração e permissões. Indicadores de urgência suspensos.</p>}
    <div className="mt-6 space-y-3">
      {deals.length===0 && <p className="rounded-xl border p-5 text-sm text-muted-foreground">Não existem negócios em curso visíveis neste perfil.</p>}
      {deals.map(d=>{
        const outstanding = open(d);
        const urgency = taskDataReady ? deadlineUrgency(d.escritura_at,outstanding.filter(t=>t.critical).length,outstanding.length) : "sem_prazo";
        const remaining = remainingTime(d.escritura_at);
        return <section key={d.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-semibold">Processo {d.id.slice(0,8).toUpperCase()}</h2><p className="text-xs text-muted-foreground">Fase: {d.stage} · Crédito: {d.credit_stage}</p></div>
            <span className="rounded-full border px-2 py-1 text-xs">{urgency.replaceAll("_"," ")}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Escritura: {d.escritura_at?new Date(d.escritura_at).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"}):"por definir"}</span>
            <span>Prazo: {remaining?(remaining.expired?"vencido":`${remaining.days}d ${remaining.remainderHours}h`):"—"}</span>
            <span>Gestor: {d.transaction_manager_id?"atribuído":"não atribuído"}</span>
            <span>Tarefas pendentes: {taskDataReady?outstanding.length:"—"}</span>
          </div>
        </section>;
      })}
    </div>
    <p className="mt-6 text-xs text-muted-foreground">Este painel é de consulta. A conclusão documental e o envio de alertas exigem confirmação por utilizadores autorizados.</p>
    <Link href="/admin" className="mt-4 inline-block text-sm underline">Voltar ao painel de gestão</Link>
  </main>;
}
