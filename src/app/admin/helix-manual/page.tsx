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
    { title: "Gestão processual", body: "Checklist por negócio com tarefas condicionais, responsáveis, prazos, documentos, validação e histórico. Implementação da persistência ainda pendente de migração e testes." },
    { title: "Prazos", body: "Alertas contratuais previstos aos 30, 15, 7, 3 e 1 dias. Validação pré-escritura começa pelo menos 7 dias antes; pendências escalam aos 5, 3, 2 e 1 dias." },
    { title: "Portais", body: "Comprador e proprietário só devem ver tarefas e documentos destinados à sua parte. Upload nunca equivale a validação." },
    { title: "Permissões", body: "Acesso a este manual: Super Admin autenticado (perfil atualmente equivalente à autoridade arquitetural brand). Acesso a dados e documentos deve ser reforçado com RLS." },
    { title: "Segurança", body: "Foi detetada política demasiado ampla no bucket deal-docs. A correção está preparada no PR #114 e ainda não foi aplicada nem validada em produção." },
    { title: "Evolução", body: "Especificado: regras e arquitetura. Em desenvolvimento: indicadores, estrutura de tarefas e segurança. Não publicado: notificações, sincronização de portais, gestor processual e UI operacional." },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Helix · Super Admin · Documentação reservada</p>
        <h1 className="mt-2 text-3xl font-semibold">Manual técnico Helix</h1>
        <p className="mt-2 text-sm text-muted-foreground">Versão 0.1 · Documento vivo. Os estados refletem desenvolvimento, não funcionalidades publicadas.</p>
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
