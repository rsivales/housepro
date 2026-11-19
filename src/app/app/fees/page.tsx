import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { helixFeesWorkspace } from "@/lib/db/helix-fees";
import { FeesWorkspace } from "@/components/admin/fees-workspace";
export const metadata = { title: "Fees e Pro Producer · Helix" };
export default async function FeesPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (session.demo) return <main className="p-8">Os fees requerem uma conta real.</main>;
  let data;
  try { data = await helixFeesWorkspace(session.agent); }
  catch { return <main className="p-8">A gestão de fees está temporariamente indisponível.</main>; }
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
    <Link className="text-sm text-primary" href="/app">Voltar ao início</Link>
    <h1 className="font-display text-3xl">Fees e Pro Producer</h1>
    <p className="text-sm text-muted-foreground">Pro Producer: 80% antes de royalties e pensão, mediante aprovação da Marca. Fee de 300 €/mês à agência a partir do mês da aprovação. Os fees tecnológicos são definidos pela Marca separadamente para cada agência e agente.</p>
    {session.viewingAs ? <p>Termine a vista «Ver como» para gerir fees.</p> : <FeesWorkspace data={data} />}
  </main>;
}
