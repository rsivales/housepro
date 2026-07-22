import type { Metadata } from "next";
import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  CalendarClock,
  Calculator,
  Inbox,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Presentation,
  Target,
  TrendingUp,
  Upload,
  UserPlus,
} from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listPropertiesByAgent, listLeadsByAgent } from "@/lib/db/repo";
import { LEAD_STATUS_LABEL } from "@/lib/data/leads";
import { formatPhone } from "@/lib/format";
import { AgentAvatar } from "@/components/brand/agent-avatar";
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

  const mine = await listPropertiesByAgent(agent.id);
  const leads = await listLeadsByAgent(agent.id);
  const novas = leads.filter((l) => l.status === "novo").length;

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
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" /> Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

        {/* Quick actions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Action icon={Upload} title="Carregar imóvel" href="/app/imovel/novo" note="Fotos + marca de água" />
          <Action icon={LayoutGrid} title="A minha montra" href={`/consultor/${agent.id}`} note="Página pública" />
          <Action icon={TrendingUp} title="Processos" href="/processo/d1" note="Acompanhar negócios" />
          <Action icon={Presentation} title="Reunião Uau" href="/app/reuniao" note="Apresentações + PDF" />
        </div>

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
                          {l.propertyRef && <> · Ref. {l.propertyRef}</>}
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

function Action({
  icon: Icon,
  title,
  href,
  note,
}: {
  icon: ElementType;
  title: string;
  href: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </Link>
  );
}
