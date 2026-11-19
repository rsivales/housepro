import Link from "next/link";
import {Users,CalendarClock,Briefcase,Coins,Plus,Calculator,Mail} from "lucide-react";
import type {Agent} from "@/lib/data/types";
import {listLeadsByAgent,listVisitsByOwner,listTasksByOwner,listPropertiesByAgency,getQuotesConfig,getAgencyById,listNotifications,notificationCounts} from "@/lib/db/repo";
import {listDeals} from "@/lib/db/deals";
import {personalMonthNet} from "@/lib/db/commission-cycles";
import {commissionCycles} from "@/lib/db/commission-management";
import {cycleProgress} from "@/lib/data/commission-cycle";
import {formatMoney} from "@/lib/data/finance-access";
import {getCurrentTemperature} from "@/lib/weather";
import {quoteTextOfDay} from "@/lib/data/quotes";
import {LATEST_RELEASE} from "@/lib/data/releases";
import {PersonalMotivationBanner} from "./personal-banner";
import {CustomWidgetArea} from "./custom-widget-area";
import {LeadInboxView} from "@/components/consultant/lead-inbox-view";
import {NotificationsInbox,LastAngariadoBanner} from "@/components/consultant/dashboard-extras";
import {ContactSlaWatcher} from "@/components/consultant/contact-sla-watcher";
import {PadrinhoAutoRedeem} from "@/components/afilhados/padrinho-auto-redeem";
import {contactWait,websiteForm} from "@/lib/data/lead-answers";
export async function ProfessionalHome({agent,demo}:{agent:Agent;demo:boolean}){
 const now=new Date();
 const [leads,visits,tasks,agencyProps,agency,quotes,cycles,deals,notifs,counts,monthNet]=await Promise.all([
  listLeadsByAgent(agent.id),listVisitsByOwner(agent.id),listTasksByOwner(agent.id),
  agent.agencyId?listPropertiesByAgency(agent.agencyId):Promise.resolve([]),
  agent.agencyId?getAgencyById(agent.agencyId):Promise.resolve(undefined),getQuotesConfig(),
  demo?Promise.resolve([]):commissionCycles([agent.id]),demo?Promise.resolve([]):listDeals(agent.id,false),
  listNotifications(agent.id,5,0,true),notificationCounts(agent.id),!demo&&agent.agencyId?personalMonthNet(agent.id,agent.agencyId,now):Promise.resolve(0)
 ]);
 const c=cycles[0],p=c?cycleProgress(c,now):null;
 const location=agency?.region??agent.agency;const temperature=demo?undefined:await getCurrentTemperature(location);
 const upcoming=visits.filter(v=>v.status==="agendada"&&Date.parse(v.at)>=now.getTime()).sort((a,b)=>a.at.localeCompare(b.at));
 const weekLimit=now.getTime()+7*86400000;const weekVisits=upcoming.filter(v=>Date.parse(v.at)<weekLimit).length;
 const active=deals.filter(d=>!["concluido","cancelado"].includes(d.stage));
 const pendingTasks=tasks.filter(t=>!t.done).sort((a,b)=>(a.dueAt??"9999").localeCompare(b.dueAt??"9999"));
 const dateLabel=now.toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon",weekday:"long",day:"numeric",month:"long"});

 return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6"><PadrinhoAutoRedeem/><ContactSlaWatcher agentId={agent.id} demo={demo}/>{demo&&<p className="rounded-xl border p-3 text-sm">Ambiente de demonstração.</p>}
 <PersonalMotivationBanner firstName={agent.name.split(" ")[0]} dateLabel={dateLabel} location={location} temperature={temperature} quote={quoteTextOfDay(now,quotes)} faturacaoPct={c?Math.round(Math.min(100,c.gross/c.annualRevenueGoal*100)):0} angariacoes={{done:c?.listings??0,total:c?.annualListingsGoal??0}} faltamEuros={p?.goalGap}/>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Leads por contactar",value:String(leads.filter(l=>l.status==="novo").length),href:"/app/leads",Icon:Users},{label:"Visitas nos próximos 7 dias",value:String(weekVisits),href:"/app/agenda",Icon:CalendarClock},{label:"Negócios ativos",value:String(active.length),href:"/app/crm",Icon:Briefcase},{label:"Líquido pessoal · fechos deste mês",value:formatMoney(monthNet),href:"/app/pagamentos?period=month&kind=producao",Icon:Coins}].map(({label,value,href,Icon})=><Link key={label} href={href} className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md"><Icon className="size-7 shrink-0 text-[var(--hx-red)]"/><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div></Link>)}</div>
 <div className="grid items-start gap-5 xl:grid-cols-2"><section className="rounded-2xl border bg-card p-5"><h2 className="font-display text-xl">Por tratar · pedidos do website</h2><LeadInboxView agentId={agent.id} cards={[...leads].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(l=>({id:l.id,content:<Link href={`/app/leads/${l.id}`} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{l.name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{websiteForm(l.source,l.subSource,l.message)||l.subSource||"Contacto"} · {l.source}</p></div><span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm text-red-800">{contactWait(l.createdAt,now.getTime())}</span></Link>}))}/></section>
 <div className="space-y-5"><section className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl">A minha agenda</h2><Link href="/app/agenda" className="text-sm font-semibold text-primary">Ver agenda</Link></div><div className="mt-3 divide-y">{upcoming.slice(0,3).map(v=><Link key={v.id} href="/app/agenda" className="flex gap-4 py-3"><span className="shrink-0 rounded-lg bg-secondary p-2 text-sm font-semibold">{new Date(v.at).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon",day:"2-digit",month:"2-digit"})}<br/>{new Date(v.at).toLocaleTimeString("pt-PT",{timeZone:"Europe/Lisbon",hour:"2-digit",minute:"2-digit"})}</span><div><p className="font-semibold">{v.kind==='visita'?"Visita":v.kind==='reuniao'?"Reunião":v.kind==='avaliacao'?"Avaliação":"Compromisso"}{v.contactName?` · ${v.contactName}`:""}</p><p className="mt-1 text-sm text-muted-foreground">{v.location||v.propertyRef||"Consultar detalhes"}</p></div></Link>)}</div>{!upcoming.length&&<p className="mt-4 text-sm text-muted-foreground">Sem compromissos agendados.</p>}{pendingTasks.length>0&&<div className="mt-3 border-t pt-3"><h3 className="mb-2 text-sm font-semibold">Tarefas pendentes · {pendingTasks.length}</h3>{pendingTasks.slice(0,3).map(t=><Link key={t.id} href="/app/agenda" className="block py-2 text-sm">{t.title}{t.dueAt&&<span className="ml-2 text-muted-foreground">{new Date(t.dueAt).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"})}</span>}</Link>)}</div>}</section>
 <NotificationsInbox items={notifs} unreadCount={counts.unread}/>
 <section className="rounded-2xl border bg-card p-5"><h2 className="font-display text-xl">Atualizações do Helix</h2><p className="mt-2 text-sm text-muted-foreground">{LATEST_RELEASE.title}</p><Link href="/app/atualizacoes" className="mt-3 inline-block rounded-xl border px-4 py-2 text-sm font-semibold text-primary">Ver novidades</Link></section></div></div>
 {agencyProps[0]&&<LastAngariadoBanner property={agencyProps[0]} agentName={agencyProps[0].agent?.name}/>}
 <section className="rounded-2xl border bg-card p-5"><h2 className="font-display text-xl">Acessos rápidos</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Carregar imóvel",href:"/app/imovel/novo",Icon:Plus},{label:"Nova campanha",href:"/app/x-campaigns",Icon:Mail},{label:"Reunião Uau",href:"/app/reuniao",Icon:CalendarClock},{label:"Calculadoras",href:"/app/ferramentas",Icon:Calculator}].map(({label,href,Icon})=><Link key={href} href={href} className="flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 font-semibold hover:bg-secondary"><Icon className="size-5"/>{label}</Link>)}</div></section><CustomWidgetArea/></main>;
}
