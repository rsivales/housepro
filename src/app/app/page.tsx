import type { Metadata } from "next";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  CalendarClock,
  Calculator,
  Coins,
  Inbox,
  LayoutGrid,
  LogOut,
  MessageSquare,
  PhoneCall,
  PiggyBank,
  Presentation,
  Store,
  Target,
  Trophy,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wallet,
  Network,
  ShieldCheck,
  Scale,
  Share2,
  Megaphone,
  ArrowRight,
} from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listPropertiesByAgent, listLeadsByAgent, listPropertiesByAgency, listNotifications } from "@/lib/db/repo";
import { phraseOfTheDay, demoNotifications, demoActivities, tipOfTheDay } from "@/lib/data/dashboard";
import { PhraseOfTheDay, LastAngariadoBanner, NotificationsInbox, ActivitiesBoard } from "@/components/consultant/dashboard-extras";
import { LEAD_STATUS_LABEL } from "@/lib/data/leads";
import { referralsIncoming } from "@/lib/data/referrals";
import { ClientModeToggle } from "@/components/consultant/client-mode-toggle";
import { DocNote } from "@/components/consultant/doc-note";
import { PropertyRef } from "@/components/property/property-ref";
import { agentById, agentPrefixOf } from "@/lib/data/mock";
import { formatPhone } from "@/lib/format";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { PadrinhoAutoRedeem } from "@/components/afilhados/padrinho-auto-redeem";
import { ContactSlaWatcher } from "@/components/consultant/contact-sla-watcher";
import { PropertyCard } from "@/components/property/property-card";
import { ShareProperty } from "@/components/property/share-property";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Área profissional" };

const goals = [
  { icon: Target, label: "Angariações (mês)", value: "3 / 5", pct: 60 },
  { icon: TrendingUp, label: "Fechos (trimestre)", value: "2 / 4", pct: 50 },
  { icon: Award, label: "Pontos", value: "1 240", pct: 72 },
];

export default async function AppPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent, demo } = session;

  // O advogado tem o seu próprio ambiente (LegalFlow), não o painel de consultor.
  if (agent.roleKey === "advogado") redirect("/app/legalflow");

  const mine = await listPropertiesByAgent(agent.id);
  const leads = await listLeadsByAgent(agent.id);
  const novas = leads.filter((l) => l.status === "novo").length;
  const refsNovas = referralsIncoming(agent.id).filter((r) => r.status === "pendente").length;

  // Dashboard: frase do dia, notificações, última angariação da agência, atividades.
  const phrase = phraseOfTheDay();
  const tip = tipOfTheDay();
  const realNotifs = await listNotifications(agent.id);
  const notifs = realNotifs.length ? realNotifs : demoNotifications();
  const activities = demoActivities();
  const agencyProps = agent.agencyId ? await listPropertiesByAgency(agent.agencyId) : [];
  const lastAngariado = agencyProps[0];
  const lastAngariadoAgent = lastAngariado ? agentById(lastAngariado.agentId) : undefined;

  return (
    <div className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AgentAvatar agent={agent} className="size-9" />
            <div>
              <p className="text-sm font-medium leading-none">{agent.name}</p>
              <p className="text-xs text-muted-foreground">
                {agent.role} · {agent.agency || "HousePro"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                Código {agentPrefixOf(agent.id)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClientModeToggle />
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="size-4" /> Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PadrinhoAutoRedeem />
        {demo && (
          <div className="mb-6 rounded-xl border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Modo demo</strong> — a
            autenticação Supabase ainda não está ligada. Está a ver a área de um
            consultor de exemplo.
          </div>
        )}

        <h1 className="font-display text-2xl sm:text-3xl">
          Olá, {agent.name.split(" ")[0]} 👋
        </h1>

        {agent.role === "admin" && (
          <Link
            href="/admin"
            className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Administração da marca</p>
                <p className="text-sm opacity-90">
                  Agências, consultores, imóveis, aprovações e marca de água
                </p>
              </div>
            </div>
            <ArrowRight className="size-5 shrink-0" />
          </Link>
        )}

        {/* Frase do dia + última angariação da agência */}
        <PhraseOfTheDay phrase={phrase} />
        {lastAngariado && (
          <LastAngariadoBanner property={lastAngariado} agentName={lastAngariadoAgent?.name} />
        )}

        {/* Notificações + atividades em curso */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NotificationsInbox items={notifs} />
          <ActivitiesBoard activities={activities} tip={tip} />
        </div>

        {/* Navegação por secções — chips com ícone que saltam para o grupo (ótimo no telemóvel) */}
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SectionChip icon={Store} label="Imóveis" href="#g-imoveis" />
          <SectionChip icon={Target} label="Negócios" href="#g-negocios" />
          <SectionChip icon={Coins} label="Rede & ganhos" href="#g-rede" />
          <SectionChip icon={GraduationCap} label="Crescer" href="#g-crescer" />
        </nav>

        {/* Imóveis */}
        <ActionGroup id="g-imoveis" title="Imóveis & montra">
          <Action icon={Upload} title="Carregar imóvel" href="/app/imovel/novo" note="Fotos + comissão + marca de água" />
          <Action icon={Store} title="Mercado & comissões" href="/app/mercado" note="Imóveis da rede + referências" />
          <Action icon={LayoutGrid} title="A minha montra" href={`/consultor/${agent.id}`} note="Página pública" />
          <Action icon={Share2} title="Portais & exportações" href="/app/portais" note="Idealista, Imovirtual, Facebook…" />
        </ActionGroup>

        {/* Negócios */}
        <ActionGroup id="g-negocios" title="Clientes & negócios">
          <Action icon={Users} title="Contactos" href="/app/contactos" note="Ficha central + cronologia única" />
          <Action icon={CalendarClock} title="Agenda" href="/app/agenda" note="Tarefas e visitas" />
          <Action icon={Target} title="CRM · Pipelines" href="/app/crm" note="Angariação e comprador (Kanban)" />
          <Action icon={Megaphone} title="Meta CRM" href="/app/meta" note="Leads de Facebook e Instagram" />
          <Action icon={TrendingUp} title="Processos" href="/processo/d1" note="Acompanhar negócios" />
          <Action icon={Scale} title="LegalFlow" href="/app/legalflow" note="CPCV e documentos legais com o advogado" />
          <Action icon={Presentation} title="Reunião Uau" href="/app/reuniao" note="Apresentações + PDF" />
          <Action icon={BookOpen} title="Guiões de reunião" href="/app/guioes" note="Angariação, venda e objeções" />
        </ActionGroup>

        {/* Rede & ganhos */}
        <ActionGroup id="g-rede" title="Rede & ganhos">
          <Action icon={Network} title="A minha equipa" href="/app/equipa" note="Afilhados, árvore e override" />
          <Action icon={Coins} title="Comissões" href="/app/comissoes" note="Faturação e override por código" />
          <Action icon={Wallet} title="Faturação & pagamentos" href="/app/pagamentos" note="Produção, override, royalties e 2%" />
          <Action icon={PiggyBank} title="Fundo de pensão" href="/app/fundo-pensao" note="2% por negócio, com dividendos" />
          <Action icon={Users} title="Referências" href="/app/referencias" note="Partilhar leads (mín. 25%)" badge={refsNovas} />
          <Action icon={Briefcase} title="Referências de serviços" href="/app/servicos" note="Crédito, jurídico, energético…" />
        </ActionGroup>

        {/* Crescer */}
        <ActionGroup id="g-crescer" title="Crescer & qualidade">
          <Action icon={Trophy} title="Objetivos & Prémios" href="/app/premios" note="Metas, escada, hall da fama e medalhas" />
          <Action icon={GraduationCap} title="Formação" href="/app/formacao" note="Academia: cursos e certificação" />
          <Action icon={Scale} title="Qualidade" href="/app/qualidade" note="Reputação: méritos e infrações" />
          <Action icon={Calculator} title="Ferramentas" href="/app/ferramentas" note="IMT + Selo e outras calculadoras" />
        </ActionGroup>

        {/* Contactos & pedidos de visita */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Inbox className="size-5 text-primary" /> Contactos & pedidos de visita
            </h2>
            {novas > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {novas} nova{novas > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <ContactSlaWatcher agentId={agent.id} demo={demo} />

          {leads.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {leads.map((l) => (
                <li
                  key={l.id}
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                        {l.intent === "visita" ? (
                          <CalendarClock className="size-4.5" />
                        ) : l.intent === "custos" ? (
                          <Calculator className="size-4.5" />
                        ) : (
                          <MessageSquare className="size-4.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-none">{l.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {l.contact.includes("@") ? l.contact : formatPhone(l.contact)}
                          {l.propertyId && (
                            <>
                              {" · "}
                              <PropertyRef propertyId={l.propertyId} label={`Ref. ${l.propertyRef}`} />
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
                        (l.status === "novo"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground")
                      }
                    >
                      {LEAD_STATUS_LABEL[l.status]}
                    </span>
                  </div>

                  {l.message && (
                    <p className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                      “{l.message}”
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {l.intent === "visita"
                        ? "Pedido de visita"
                        : l.intent === "custos"
                          ? "Pedido de valor com despesas"
                          : "Mensagem"}
                    </span>
                    {l.preferredAt && (
                      <span>
                        Preferência:{" "}
                        {new Date(l.preferredAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {l.referrerId && (
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <UserPlus className="size-3.5" /> Atribuído a si (trouxe o cliente)
                      </span>
                    )}
                    {(l.coOwnerIds?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        <Users className="size-3.5" /> Partilhada com{" "}
                        {[l.ownerId, ...(l.coOwnerIds ?? [])]
                          .filter((id) => id !== agent.id)
                          .map((id) => agentById(id).name.split(" ")[0])
                          .join(", ")}
                      </span>
                    )}
                    {l.contactedBy && l.contactedBy !== agent.id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-medium text-gold-foreground">
                        <PhoneCall className="size-3.5" /> Já contactado por {agentById(l.contactedBy).name.split(" ")[0]}
                        {l.contactedAt &&
                          ` · ${new Date(l.contactedAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    )}
                    <span className="ml-auto">
                      {new Date(l.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Ainda sem contactos. Partilhe a sua montra para começar a receber
              mensagens e pedidos de visita.
            </p>
          )}
        </section>

        {/* Objetivos */}
        <section className="mt-10">
          <h2 className="font-display text-xl">Objetivos & prémios</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {goals.map((g) => (
              <div key={g.label} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                    <g.icon className="size-5" />
                  </div>
                  <span className="font-display text-xl">{g.value}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{g.label}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Os meus imóveis */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-xl">Os meus imóveis</h2>
            <span className="text-sm text-muted-foreground">{mine.length}</span>
          </div>
          {mine.length > 0 ? (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((p) => (
                <div key={p.id} className="space-y-3">
                  <PropertyCard property={p} />
                  <DocNote documents={p.documents} sellerType={p.sellerType} />
                  <ShareProperty
                    propertyId={p.id}
                    reference={p.reference}
                    consultantId={agent.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">Ainda sem imóveis publicados.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function SectionChip({ icon: Icon, label, href }: { icon: ElementType; label: string; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary"
    >
      <Icon className="size-4 text-primary" /> {label}
    </a>
  );
}

function ActionGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Action({
  icon: Icon,
  title,
  href,
  note,
  badge,
}: {
  icon: ElementType;
  title: string;
  href: string;
  note: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/50"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{note}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
