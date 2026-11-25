import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { InstitutionalMessagesManager } from "@/components/admin/institutional-messages-manager";

export const metadata = { title: "Envios institucionais — Helix" };

export default async function InstitutionalPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (session.demo || !isNetworkFinanceAdmin(session.agent)) redirect("/app");
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin/email" className="text-sm text-primary">Envio de e-mails</Link>
      <h1 className="mt-4 font-display text-3xl">Envios institucionais</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mensagens de Natal, Páscoa, feriados emblemáticos e aniversário, enviadas automaticamente a clientes,
        consultores ou brokers — cada combinação com a sua própria mensagem, ativada só quando estiver pronta.
        Usa <code className="rounded bg-secondary px-1">{"{nome}"}</code> para personalizar com o nome do destinatário.
      </p>
      <InstitutionalMessagesManager />
    </main>
  );
}
