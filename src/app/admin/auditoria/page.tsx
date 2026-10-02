import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileClock, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

export default async function AuditPage() {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Painel Super Admin</Link><p className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary"><ShieldAlert className="size-4" /> Supervisão excecional</p><h1 className="mt-1 font-display text-3xl">Centro de auditoria</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Auditoria destinada a ocorrências éticas, conformidade e gestão correta. Não é uma caixa de leads nem dá acesso comercial rotineiro aos contactos das agências.</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Publicações e imóveis","Histórico de alterações, aprovações e rejeições."],["Equipas e permissões","Alterações de função, acesso e estrutura."],["Segurança e website","Mudanças globais, versões e conteúdos públicos."]].map(([title,note]) => <article key={title} className="rounded-2xl border bg-card p-5"><FileClock className="size-6 text-primary" /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{note}</p><p className="mt-4 text-xs font-semibold text-amber-700">Acesso mediante ocorrência documentada</p></article>)}</div><div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">O registo técnico existente em <code>property_audit</code> continua associado a cada imóvel. A consulta deve partir da ocorrência ou referência concreta, evitando exposição indiscriminada de dados comerciais.</div></main>;
}
