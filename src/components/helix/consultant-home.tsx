import {
  listLeadsByAgent,
  listPropertiesByAgency,
  listVisitsByOwner,
  getQuotesConfig,
} from "@/lib/db/repo";
import { quoteTextOfDay } from "@/lib/data/quotes";
import { agencyById } from "@/lib/data/mock";
import { perfSummary } from "@/lib/data/property-perf";
import type { Agent } from "@/lib/data/types";
import type { Lead } from "@/lib/data/leads";

import { AppHeader } from "./app-header";
import { ConsultantDashboard, type DashboardData } from "./consultant-dashboard";
import { MobileBottomNavigation } from "./bottom-nav";
import { HelixSidebar } from "./helix-sidebar";
import type { ActionItem } from "./action-center";
import type { LatestProperty } from "./dashboard-cards";

const SOURCE_LABEL: Record<string, string> = {
  facebook: "Meta",
  instagram: "Meta",
  site: "Website",
  portal: "Portais",
  whatsapp: "WhatsApp",
  consultor: "Referência",
};

function ago(iso: string, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Dashboard do consultor (Helix) — servidor: reúne dados reais e monta o ecrã.
 * Renderiza o escopo .helix + cabeçalho + conteúdo + navegação inferior.
 */
export async function ConsultantHome({ agent, demo }: { agent: Agent; demo: boolean }) {
  const now = new Date();
  const [leads, agencyProps, visits, quotesExtra] = await Promise.all([
    listLeadsByAgent(agent.id),
    agent.agencyId ? listPropertiesByAgency(agent.agencyId) : Promise.resolve([]),
    listVisitsByOwner(agent.id),
    getQuotesConfig(),
  ]);

  // Leads por origem + total de novas.
  const novas = leads.filter((l) => l.status === "novo");
  const counts = new Map<string, number>();
  for (const l of leads) {
    const label = SOURCE_LABEL[l.source] ?? "Outras";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const bySource = [...counts.entries()].map(([source, count]) => ({ source, count }));

  // Centro de ação (até 5): lead mais recente, próxima visita, documento pendente.
  const actions: ActionItem[] = [];
  const newest = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] as Lead | undefined;
  if (newest) {
    actions.push({
      id: `lead-${newest.id}`,
      icon: "lead",
      title: "Nova lead",
      subtitle: `${SOURCE_LABEL[newest.source] ?? "Lead"} · ${ago(newest.createdAt, now)}`,
      phone: newest.contact,
    });
  }
  const nextVisit = [...visits].filter((v) => v.status === "agendada").sort((a, b) => a.at.localeCompare(b.at))[0];
  if (nextVisit) {
    const t = new Date(nextVisit.at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    actions.push({
      id: `visit-${nextVisit.id}`,
      icon: "visit",
      title: `Visita${nextVisit.contactName ? ` com ${nextVisit.contactName}` : ""}`,
      subtitle: t,
      badge: { tone: "blue", label: "Confirmada" },
      href: "/app/agenda",
    });
  }
  // Documento pendente (demo/placeholder) — CPCV a agendar.
  actions.push({
    id: "doc-cpcv",
    icon: "doc",
    title: "CPCV HP-1048 · agendar",
    badge: { tone: "red", label: "Pendente" },
    href: "/app/legalflow",
  });

  // Último imóvel da agência.
  const p = agencyProps[0];
  const latestProperty: LatestProperty | null = p
    ? {
        id: p.id,
        image: p.image || undefined,
        typology: p.typology ?? undefined,
        location: p.municipality,
        price: p.price,
        agentName: p.agent?.name,
        when: p.listedAt ? ago(p.listedAt, now) : undefined,
        published: p.approval ? p.approval === "aprovado" : undefined,
      }
    : null;

  // KPIs "O meu ritmo".
  const items = agencyProps
    .filter((x) => x.agentId === agent.id)
    .map((property) => ({ property, leadCount: leads.filter((l) => l.propertyId === property.id).length }));
  const summary = perfSummary(items, now);
  const myProps = items.length || agencyProps.length;

  const data: DashboardData = {
    firstName: agent.name.split(" ")[0] ?? agent.name,
    dateLabel: capitalize(now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })),
    location: agencyById(agent.agencyId)?.region ?? agent.agency,
    temperature: demo ? "26°" : undefined,
    quote: quoteTextOfDay(now, quotesExtra),
    // Estatísticas motivacionais (fixtures em demo — claramente separadas).
    faturacaoPct: 68,
    angariacoes: { done: 3, total: 5 },
    faltamEuros: 4250,
    actions,
    leads: { total: novas.length, bySource },
    latestProperty,
    rhythm: {
      sla: 92,
      slaTrend: "8 p.p.",
      visits: visits.length || 7,
      visitsTrend: "2",
      proposals: 3,
      proposalsTrend: "1",
      properties: myProps || 12,
      propertiesNoContact: summary.noContact,
      spark: [3, 5, 4, 6, 5, 7, 6],
    },
  };

  return (
    <div className="helix min-h-dvh pb-28">
      <AppHeader
        name={agent.name}
        photo={agent.photo}
        agency={agent.agency}
        code={agencyById(agent.agencyId)?.region}
        hasUnread
      />
      <HelixSidebar active="inicio" />
      <div className="lg:pl-[76px]">
        <ConsultantDashboard data={data} />
      </div>
      <MobileBottomNavigation active="inicio" />
    </div>
  );
}
