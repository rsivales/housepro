import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { demoPayouts } from "@/lib/data/payments";
import { PaymentsBoard } from "@/components/consultant/payments-board";

export const metadata: Metadata = { title: "Faturação & pagamentos" };

export default async function PagamentosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;
  const canManage = isStaff(agent);

  const all = demoPayouts();
  const list = canManage ? all : all.filter((p) => p.beneficiaryId === agent.id);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Wallet className="size-7 text-primary" /> Faturação & pagamentos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cada fecho de negócio gera linhas de pagamento por beneficiário — produção,
          override de rede, royalties da agência e os 2% do fundo de pensão. Acompanha o
          estado de cada uma, do processamento ao pagamento.
        </p>

        <PaymentsBoard initial={list} canManage={canManage} demo={session.demo} />
      </div>
    </div>
  );
}
