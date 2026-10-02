import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Eye, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin, ROLE_LABEL, ROLE_ORDER } from "@/lib/data/roles";
import { menuForRole } from "@/lib/data/role-menus";

export default async function RolePreviewPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  const query = await searchParams;
  const selected = ROLE_ORDER.includes(query.role as never) ? query.role as (typeof ROLE_ORDER)[number] : "agente";
  const groups = menuForRole(selected);
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Painel Super Admin</Link>
    <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary"><Eye className="size-4" /> Pré-visualização segura</p>
    <h1 className="mt-1 font-display text-3xl">Menus por função</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Esta vista reproduz os módulos apresentados a cada função sem assumir a identidade de outro utilizador e sem conceder acesso aos respetivos dados. As permissões do servidor continuam a usar a sessão de Super Admin.</p>
    <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
      <nav className="rounded-2xl border bg-card p-2" aria-label="Funções disponíveis">{ROLE_ORDER.map((role) => <Link key={role} href={`/admin/funcoes?role=${role}`} className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm ${role === selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><span>{ROLE_LABEL[role]}</span><ChevronRight className="size-4" /></Link>)}</nav>
      <section className="rounded-3xl border bg-card p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Área de trabalho</p><h2 className="text-xl font-bold">{ROLE_LABEL[selected]}</h2></div></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">{groups.map((group) => <div key={group.title}><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.title}</h3><div className="mt-2 overflow-hidden rounded-xl border">{group.items.map((item) => <div key={item.href} className="flex min-h-12 items-center justify-between border-b px-4 text-sm last:border-0"><span>{item.label}</span><code className="text-[10px] text-muted-foreground">{item.href}</code></div>)}</div></div>)}</div>
      </section>
    </div>
  </main>;
}
