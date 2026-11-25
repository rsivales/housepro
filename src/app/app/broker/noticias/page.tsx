import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { agencyWorkspaces, authorizedAgency } from "@/lib/db/agency-finance";
import { NewsletterBoard } from "@/components/admin/newsletter-board";
import { LocalNewsEditor } from "@/components/admin/local-news-editor";

export default async function BrokerNews({ searchParams }: { searchParams: Promise<{ agency?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (session.demo) redirect("/app");
  const { agency: requested } = await searchParams;
  const workspaces = await agencyWorkspaces(session.agent);
  const agencyId = requested ?? (workspaces.length === 1 ? workspaces[0].id : "");
  if (!agencyId) return <main className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-3xl">Notícias locais</h1>{workspaces.map(a => <Link className="block text-primary" href={`?agency=${a.id}`} key={a.id}>{a.name}</Link>)}</main>;
  try { await authorizedAgency(session.agent, agencyId); } catch { return <main className="p-6">Sem acesso a esta agência.</main>; }
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-9 sm:px-6"><Link href={`/app/broker?agency=${agencyId}`} className="text-sm text-primary">Gestão da agência</Link><header><p className="text-sm font-semibold text-primary">Helix · Broker</p><h1 className="font-display text-3xl">Notícias locais e newsletter</h1><p className="mt-2 text-muted-foreground">Partilhe comunidade, recrutamento, mercado, projetos e novidades da sua agência. O envio só abrange subscritores confirmados desta agência.</p></header><LocalNewsEditor agencyId={agencyId} readOnly={Boolean(session.viewingAs)} /><NewsletterBoard agencyId={agencyId} readOnly={Boolean(session.viewingAs)} /></main>;
}
