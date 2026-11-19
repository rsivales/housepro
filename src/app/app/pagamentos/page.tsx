import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import {personalPayoutVisible} from "@/lib/data/personal-finance";
import { listFinancialPayouts, mapFinancialPayout } from "@/lib/db/finance";

import { demoPayouts } from "@/lib/data/payments";
import { PaymentsBoard } from "@/components/consultant/payments-board";

export const metadata: Metadata = { title: "Faturação & pagamentos" };

export default async function PagamentosPage({searchParams}:{searchParams:Promise<{period?:string;kind?:string}>}) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;
  const q=await searchParams;
  const month=q.period==="month"?new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit"}).format(new Date()):undefined;
  const rows=session.demo?[]:await listFinancialPayouts(agent,true);
  const list=session.demo?demoPayouts().filter(p=>p.beneficiaryId===agent.id&&["producao","override","pensao"].includes(p.role)):rows.filter(p=>personalPayoutVisible(p,agent.id,{month,kind:q.kind})).map(mapFinancialPayout);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Wallet className="size-7 text-primary" /> Os meus pagamentos
        </h1><Link href="/app/fees" className="mt-3 inline-block text-sm font-semibold text-primary">Fees e Pro Producer</Link>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Apenas os teus valores como consultor: produção, override e fundo de pensão. Os pagamentos da agência e da Marca têm áreas próprias.
        </p>

        {month&&<p className="mt-4 rounded-xl border p-3 text-sm">Fechos deste mês{q.kind==='producao'?" · líquido de produção pessoal":""}. <Link href="/app/pagamentos" className="font-semibold text-primary">Ver todos os meus pagamentos</Link></p>}
        <PaymentsBoard canManageRoyalties={false} initial={list} canManage={false} demo={session.demo} />
      </div>
    </div>
  );
}
