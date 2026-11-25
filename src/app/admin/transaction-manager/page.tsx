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
  property?: { reference?: string; title?: string } | { reference?: string; title?: string }[] | null;
};
type TaskRow = { deal_id: string; status: string; critical: boolean; applicability: string };

const CREDIT_LABEL: Record<string, string> = {
  sem_credito: "sem crédito",
  pedido: "crédito pedido",
  aprovacao: "em aprovação",
  avaliacao: "em avaliação",
  escritura_marcada: "escritura marcada",
};

export default async function TransactionManagerPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isStaff(session.agent)) redirect("/app");
  if (session.demo) return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-semibold">Gestão processual</h1><p className="mt-2 text-muted-foreground">Disponível apenas com sessão e dados reais.</p></main>;
  const db = await createClient();
  const dealsResult = await db.from("deals")
    .select("id,stage,credit_stage,amount,created_at,escritura_at,cpcv_deadline_at,transaction_manager_id,property:properties!property_id(reference,title)")
    .not("stage","in",'("concluido","cancelado")')
    .order("escritura_at",{ascending:true,nullsFirst:false}).limit(150);
  if (dealsResult.error) {
    return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-semibold">Gestão processual</h1><p className="mt-3 text-sm text-destructive">Não foi possível consultar os processos. Confirme a migração e as permissões antes de utilizar este painel.</p></main>;
  }
  const deals = (dealsResult.data ?? []) as unknown as DealRow[];
  const tasksResult = deals.length ? await db.from("deal_tasks")
    .select("deal_id,status,critical,applicability").in("deal_id",deals.map(d=>d.id)) : {data:[],error:null};
  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const taskDataReady = !tasksResult.error;
  const open = (d:DealRow) => tasks.filter(t=>t.deal_id===d.id && t.applicability!=="not_applicable" && !["validated","waived"].includes(t.status));
  const creditStuck = deals.filter(d=>["pedido","aprovacao","avaliacao"].includes(d.credit_stage));
  const withoutManager = deals.filter(d=>!d.transaction_manager_id);
  const stats = { total:deals.length, withManager:deals.length-withoutManager.length,
    urgent:taskDataReady?deals.filter(d=>["critico","urgente","vencido"].includes(deadlineUrgency(d.escritura_at,open(d).filter(t=>t.critical).length,open(d).length))).length:null,
    creditStuck: creditStuck.length };

  const now = Date.now();
  const within = (days:number) => deals.filter(d=>{
    if(!d.escritura_at) return false;
    const diffDays = (new Date(d.escritura_at).getTime()-now)/86_400_000;
    return diffDays>=0 && diffDays<=days;
  });
  const windows: { label:string; deals: DealRow[] }[] = [
    { label: "Próximos 7 dias", deals: within(7) },
    { label: "8 a 15 dias", deals: within(15).filter(d=>!within(7).includes(d)) },
    { label: "16 a 30 dias", deals: within(30).filter(d=>!within(15).includes(d)) },
  ];
  const noDate = deals.filter(d=>!d.escritura_at);

  const propertyOf = (d: DealRow) => Array.isArray(d.property) ? d.property[0] : d.property;

  function DealCard({ d }: { d: DealRow }) {
    const outstanding = open(d);
    const urgency = taskDataReady ? deadlineUrgency(d.escritura_at,outstanding.filter(t=>t.critical).length,outstanding.length) : "sem_prazo";
    const remaining = remainingTime(d.escritura_at);
    const p = propertyOf(d);
    return (
      <Link href={`/app/crm/${d.id}`} className="block rounded-xl border bg-card p-4 transition hover:border-primary/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{p?.reference ? `Ref. ${p.reference}` : `Processo ${d.id.slice(0,8).toUpperCase()}`}</h2>
            <p className="text-xs text-muted-foreground">{p?.title ? `${p.title} · ` : ""}Fase: {d.stage} · {CREDIT_LABEL[d.credit_stage] ?? d.credit_stage}</p>
          </div>
          <span className="rounded-full border px-2 py-1 text-xs capitalize">{urgency.replaceAll("_"," ")}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Escritura: {d.escritura_at?new Date(d.escritura_at).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"}):"por definir"}</span>
          <span>Prazo: {remaining?(remaining.expired?"vencido":`${remaining.days}d ${remaining.remainderHours}h`):"—"}</span>
          <span>Gestor: {d.transaction_manager_id?"atribuído":"não atribuído"}</span>
          <span>Tarefas pendentes: {taskDataReady?outstanding.length:"—"}</span>
        </div>
      </Link>
    );
  }

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <p className="text-sm font-medium text-primary">Helix · Gestão de processos</p>
    <h1 className="mt-1 text-3xl font-semibold">Transaction Manager</h1>
    <p className="mt-2 text-sm text-muted-foreground">Processos acessíveis ao seu perfil, sujeitos às permissões da base de dados. Atribua a gestora processual e os prazos na ficha de cada negócio.</p>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["Negócios em curso",stats.total],["Com gestor atribuído",stats.withManager],["Urgentes",stats.urgent??"—"],["Créditos em curso",stats.creditStuck]].map(([label,value])=>
        <div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}
    </div>
    {!taskDataReady && <p className="mt-5 rounded-lg border p-3 text-sm text-amber-700">Checklist indisponível: confirmar migração e permissões. Indicadores de urgência suspensos.</p>}

    {deals.length===0 && <p className="mt-6 rounded-xl border p-5 text-sm text-muted-foreground">Não existem negócios em curso visíveis neste perfil.</p>}

    {windows.map(w => w.deals.length>0 && (
      <section key={w.label} className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</h2>
        <div className="mt-3 space-y-3">{w.deals.map(d=><DealCard key={d.id} d={d} />)}</div>
      </section>
    ))}

    {noDate.length>0 && (
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sem data de escritura marcada</h2>
        <div className="mt-3 space-y-3">{noDate.map(d=><DealCard key={d.id} d={d} />)}</div>
      </section>
    )}

    <p className="mt-8 text-xs text-muted-foreground">Toque num processo para abrir a ficha do negócio, atribuir a gestora processual, definir prazos e validar a checklist pré-escritura.</p>
    <Link href="/admin" className="mt-4 inline-block text-sm underline">Voltar ao painel de gestão</Link>
  </main>;
}
