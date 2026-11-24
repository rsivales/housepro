import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

export const metadata = { title: "Manual técnico — Helix" };
export const dynamic = "force-dynamic";

/**
 * Technical documentation: server-side authorization, never delivered to
 * unauthenticated or non-superadmin clients. Existing Helix currently uses
 * 'superadmin' as the architecture authority (not a literal 'brand' role).
 */
export default async function HelixTechnicalManual() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (session.demo || session.viewingAs || !isSuperadmin(session.agent)) notFound();

  const sections = [
    { title: "Arquitetura", body: "Next.js 15, TypeScript, Supabase e Vercel. Mudanças estruturais exigem revisão e testes antes de produção." },
    { title: "Transações", body: "Proposta enviada → aceite → reserva → CPCV → escritura → concluído. Crédito decorre em paralelo, sem coluna própria no Kanban principal." },
    { title: "Gestão processual", body: "Checklist condicional por negócio (deal_tasks), com fases pré-CPCV/crédito/pós-CPCV/pré-escritura/pós-escritura, responsáveis, prazos, validação e histórico de auditoria. Implementado e ligado à ficha do negócio em /app/crm/[id]." },
    { title: "Prazos", body: "Validação pré-escritura inicia 7 dias antes; pendências escalam aos 5, 3, 2 e 1 dias, e todos os dias em atraso após o vencimento. Mudar a data da escritura/CPCV avança a versão do prazo e realinha a checklist automaticamente (trigger na base de dados)." },
    { title: "Alertas", body: "Cron diário helix-transaction-deadlines (07:00 UTC) escala por e-mail à gestora processual, coordenação, consultor e — a partir das 48h com pendências críticas — ao broker da agência. Deduplicado por negócio/marco/versão do prazo/destinatário (deal_alert_dispatches)." },
    { title: "Portais", body: "Comprador (/cliente/comprador) e proprietário (/cliente/vendedor) veem só as suas próprias tarefas (audience=buyer/seller) e carregam o documento pedido. O acesso é verificado pelo contacto autenticado (comprador) ou pelo email verificado (proprietário) — nunca por um id que o cliente envie. O upload nunca valida: só move a tarefa para 'received'." },
    { title: "Permissões", body: "Acesso a este manual: Super Admin autenticado. Atribuir gestor processual e prazos: staff (coordenação e acima) da agência do negócio. Validar/rejeitar tarefas da checklist: equipa do negócio ou staff — nunca o cliente." },
    { title: "Segurança", body: "A política do bucket deal-docs foi corrigida para exigir participante do negócio (já em produção nesta versão). Mediação por audiência (comprador vs vendedor) falta para a fase 2." },
    { title: "Evolução", body: "Publicado: checklist, prazos, painel do Transaction Manager, alertas automáticos, integração com os portais do comprador e do proprietário. Especificado mas não implementado: manual de procedimentos para consultores/brokers." },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Helix · Super Admin · Documentação reservada</p>
        <h1 className="mt-2 text-3xl font-semibold">Manual técnico Helix</h1>
        <p className="mt-2 text-sm text-muted-foreground">Versão 0.3 · Documento vivo. Os estados refletem desenvolvimento, não funcionalidades publicadas.</p>
      </div>
      <nav aria-label="Capítulos" className="mb-8 flex flex-wrap gap-2">
        {sections.map((s,i) => <a key={s.title} href={`#cap-${i}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">{s.title}</a>)}
      </nav>
      <div className="space-y-5">
        {sections.map((s,i) => <section id={`cap-${i}`} key={s.title} className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
        </section>)}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Histórico técnico versionado no <Link className="underline" href="https://github.com/rsivales/housepro/pull/114">PR #114</Link>.</p>
    </main>
  );
}
