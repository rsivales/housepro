import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search, Users, KanbanSquare, CalendarClock, Phone, Mail, Megaphone, Share2,
  Home, Upload, Store, LayoutGrid, Building2, FileText, Scale, Presentation, BookOpen, Calculator,
  Network, UserPlus, Coins, Wallet, PiggyBank, ShoppingBag, Trophy, GraduationCap, ShieldCheck, BarChart3, ChevronRight,
} from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { AppHeader } from "@/components/helix/app-header";
import { MobileBottomNavigation } from "@/components/helix/bottom-nav";
import { HelixSidebar } from "@/components/helix/helix-sidebar";
import { agencyById } from "@/lib/data/mock";

export const metadata: Metadata = { title: "Menu — Helix" };

export default async function MenuPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const GROUPS: { title: string; items: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
    {
      title: "Comercial",
      items: [
        { label: "Leads e contactos", href: "/app/contactos", icon: Users },
        { label: "CRM e pipelines", href: "/app/meta/pipeline", icon: KanbanSquare },
        { label: "Agenda", href: "/app/agenda", icon: CalendarClock },
        { label: "X Call", href: "/app/x-call", icon: Phone },
        { label: "Campanhas e e-mail", href: "/app/x-campaigns", icon: Mail },
        { label: "Meta / Facebook", href: "/app/meta", icon: Megaphone },
        { label: "Portais e exportação", href: "/app/portais", icon: Share2 },
      ],
    },
    {
      title: "Imóveis",
      items: [
        { label: "Os meus imóveis", href: "/app/desempenho", icon: Home },
        { label: "Carregar imóvel", href: "/app/imovel/novo", icon: Upload },
        { label: "Mercado", href: "/app/mercado", icon: Store },
        { label: "A minha montra", href: `/consultor/${agent.id}`, icon: LayoutGrid },
        { label: "Imóveis da agência", href: "/imoveis", icon: Building2 },
      ],
    },
    {
      title: "Operação",
      items: [
        { label: "Processos", href: "/processo/d1", icon: FileText },
        { label: "LegalFlow", href: "/app/legalflow", icon: Scale },
        { label: "Documentos", href: "/app/legalflow", icon: FileText },
        { label: "Reunião Uau", href: "/app/reuniao", icon: Presentation },
        { label: "Guiões", href: "/app/guioes", icon: BookOpen },
        { label: "Ferramentas", href: "/app/ferramentas", icon: Calculator },
      ],
    },
    {
      title: "Rede e financeiro",
      items: [
        { label: "Equipa", href: "/app/equipa", icon: Network },
        { label: "Referências", href: "/app/referencias", icon: UserPlus },
        { label: "Comissões", href: "/app/comissoes", icon: Coins },
        { label: "Faturação", href: "/app/pagamentos", icon: Wallet },
        { label: "Fundo de pensão", href: "/app/fundo-pensao", icon: PiggyBank },
        { label: "X Market", href: "/app/x-market", icon: ShoppingBag },
      ],
    },
    {
      title: "Desenvolvimento",
      items: [
        { label: "Objetivos e prémios", href: "/app/premios", icon: Trophy },
        { label: "Formação", href: "/app/formacao", icon: GraduationCap },
        { label: "Qualidade", href: "/app/qualidade", icon: ShieldCheck },
        { label: "Relatórios", href: "/app/observabilidade", icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="helix min-h-dvh pb-28">
      <AppHeader
        name={agent.name}
        photo={agent.photo}
        agency={agent.agency}
        code={agencyById(agent.agencyId)?.region}
      />

      <HelixSidebar active="menu" />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:pl-[calc(76px+1rem)]">
        <Link href="/app/pesquisa" className="hx-card flex items-center gap-2 p-3 text-sm hx-muted">
          <Search className="size-4" /> Procurar módulos, contactos, imóveis…
        </Link>

        <div className="mt-5 space-y-6">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="hx-section-title mb-2 text-sm uppercase tracking-wide" style={{ color: "var(--hx-text-2)" }}>{g.title}</h2>
              <div className="hx-card divide-y divide-[var(--hx-border)]">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link key={it.label} href={it.href} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-[var(--hx-surface-blue)]/60">
                      <span className="grid size-9 place-items-center rounded-full" style={{ background: "var(--hx-surface-blue)", color: "var(--hx-navy)" }}>
                        <Icon className="size-5" />
                      </span>
                      <span className="flex-1 font-medium">{it.label}</span>
                      <ChevronRight className="size-4 hx-muted" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <MobileBottomNavigation active="menu" />
    </div>
  );
}
