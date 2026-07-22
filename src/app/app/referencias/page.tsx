import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { referralsIncoming, referralsOutgoing } from "@/lib/data/referrals";
import { ReferralsManager } from "@/components/referral/referrals-manager";

export const metadata: Metadata = { title: "Referências" };

export default async function ReferenciasPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const incoming = referralsIncoming(agent.id);
  const outgoing = referralsOutgoing(agent.id);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Área profissional
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Users className="size-4" /> Partilha de leads
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">Referências</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Recebe e envia referências de clientes entre consultores. Quem refere recebe
          no mínimo 25% da comissão; o destino aceita, rejeita ou contrapõe. Com acordo
          de ambos, a referência fica <span className="font-medium text-primary">ativa</span>.
        </p>

        <div className="mt-8">
          <ReferralsManager incoming={incoming} outgoing={outgoing} meId={agent.id} />
        </div>
      </main>
    </div>
  );
}
