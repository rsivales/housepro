import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Clock3, Route, UserCheck } from "lucide-react";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Distribuição de leads — Helix" };

type Destination = { leadId: string; createdAt: string; subSource: string; zone?: string; agency?: string; agent?: string; respondedAt?: string; responseMinutes?: number };
type Dashboard = { total: number; assigned: number; awaiting: number; avgResponseMinutes: number; destinations: Destination[] };

export default async function LeadsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.demo && !["diretor", "admin", "superadmin"].includes(session.agent.roleKey ?? "")) redirect("/app");
  let data: Dashboard = { total: 0, assigned: 0, awaiting: 0, avgResponseMinutes: 0, destinations: [] };
  if (!session.demo) {
    const supabase = await createClient();
    const result = await supabase.rpc("lead_routing_dashboard", { days_back: 30 });
    if (result.data) data = result.data as Dashboard;
  }
  const destinations = data.destinations ?? [];
  const counts = destinations.reduce<Record<string, number>>((acc, item) => { const key=item.agent || "Por atribuir"; acc[key]=(acc[key]||0)+1; return acc; }, {});
  const max = Math.max(1, ...Object.values(counts));
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link href={session.agent.roleKey === "superadmin" ? "/admin" : "/app"} className="inline-flex items-center gap-2 text-sm hx-muted"><ArrowLeft className="size-4" /> Voltar</Link>
    <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Últimos 30 dias</p><h1 className="mt-1 font-display text-3xl">Captação e encaminhamento de leads</h1><p className="mt-2 text-sm hx-muted">Visibilidade do broker sobre a sua agência; o Super Admin vê a auditoria global sem assumir a gestão comercial.</p></div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={BarChart3} label="Leads captadas" value={data.total} />
      <Stat icon={UserCheck} label="Encaminhadas" value={data.assigned} />
      <Stat icon={Route} label="A aguardar" value={data.awaiting} />
      <Stat icon={Clock3} label="Resposta média" value={`${data.avgResponseMinutes || 0} min`} />
    </section>
    <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-display text-xl">Leads por consultor</h2><div className="mt-5 space-y-4">{Object.entries(counts).map(([name,count])=><div key={name}><div className="mb-1 flex justify-between text-sm"><span>{name}</span><strong>{count}</strong></div><div className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(8,count/max*100)}%`}} /></div></div>)}{!Object.keys(counts).length&&<p className="text-sm hx-muted">Ainda não existem leads neste período.</p>}</div></section>
    <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm"><div className="border-b p-5"><h2 className="font-display text-xl">Destino e tempo de resposta</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase tracking-wide"><tr><th className="p-3">Captada</th><th className="p-3">Origem / zona</th><th className="p-3">Agência</th><th className="p-3">Consultor</th><th className="p-3">Resposta</th></tr></thead><tbody>{destinations.slice(0,100).map(item=><tr key={item.leadId} className="border-t"><td className="p-3">{new Intl.DateTimeFormat("pt-PT",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.createdAt))}</td><td className="p-3">{item.subSource}<br/><span className="hx-muted">{item.zone||"Zona não indicada"}</span></td><td className="p-3">{item.agency||"Por definir"}</td><td className="p-3">{item.agent||"Por atribuir"}</td><td className="p-3">{item.respondedAt ? `${item.responseMinutes ?? 0} min` : "A aguardar"}</td></tr>)}</tbody></table></div></section>
  </main>;
}

function Stat({icon:Icon,label,value}:{icon:typeof BarChart3;label:string;value:string|number}) { return <div className="rounded-2xl border bg-card p-4 shadow-sm"><Icon className="size-5 text-primary"/><p className="mt-3 font-display text-3xl">{value}</p><p className="text-sm hx-muted">{label}</p></div>; }
