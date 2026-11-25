import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { getDeal } from "@/lib/db/deals";
import { listAgenciesReal } from "@/lib/db/repo";
import { DealDetailView } from "@/components/app/deal-detail";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";
import { mayEditProperty } from "@/lib/portfolio/server";
import { listDealTasks, listTransactionManagerCandidates } from "@/lib/db/deal-tasks";
import { TransactionChecklist } from "@/components/process/transaction-checklist";
import { TransactionManagerPanel } from "@/components/process/transaction-manager-panel";
import { listDealOffers, dealOfferRef } from "@/lib/db/deal-offers";
import { DealOffersPanel } from "@/components/process/deal-offers-panel";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";

export const metadata: Metadata = { title: "Negócio — Helix" };

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/entrar");

  const staff = isStaff(session.agent);
  const deal = await getDeal(id, session.agent.id, staff, {agencyId:session.agent.agencyId,global:["superadmin","admin"].includes(session.agent.roleKey??"")});
  if (!deal) notFound();

  const agencyList = await listAgenciesReal();
  const agencies = agencyList
    .filter((ag) => ag.id !== deal.agencyId)
    .map((ag) => ({ id: ag.id, name: ag.name }));
  const {data:activity}=hasServiceRole()?await createAdminClient().from("property_activity_intakes")
    .select("id,occurred_at,amount,data,document_name")
    .eq("deal_id",id).eq("kind","proposal").order("occurred_at",{ascending:false}).limit(50):{data:[]};
  const canDownload=Boolean(deal.propertyId&&await mayEditProperty(session.agent,deal.propertyId));
  const offers = await listDealOffers(id);
  const canActOnOffers = dealTeamOrStaffAllowed(session.agent, {
    agencyId: deal.agencyId,
    team: [deal.angariadorId, deal.consultorCompradorId, deal.coordenadorId].filter((v): v is string => Boolean(v)),
  });

  const showTransactionManager = ["reserva", "cpcv", "escritura", "concluido"].includes(deal.stage);
  const [tasks, tmCandidates] = showTransactionManager
    ? await Promise.all([
        listDealTasks(id),
        staff ? listTransactionManagerCandidates(deal.agencyId) : Promise.resolve([]),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/app/crm" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> CRM · Negócios
      </Link>
      <DealDetailView deal={deal} agencies={agencies} canManage={staff} />
      <div className="mt-6">
        <DealOffersPanel
          dealId={id}
          initialOffers={offers}
          reference={dealOfferRef(id)}
          canAct={canActOnOffers}
        />
      </div>
      {showTransactionManager && (
        <div className="mt-6 space-y-6">
          {staff && (
            <TransactionManagerPanel
              dealId={id}
              escrituraAt={deal.escrituraAt}
              cpcvDeadlineAt={deal.cpcvDeadlineAt}
              transactionManagerId={deal.transactionManagerId}
              candidates={tmCandidates}
            />
          )}
          <TransactionChecklist
            dealId={id}
            initialTasks={tasks}
            escrituraAt={deal.escrituraAt}
            canManage={staff}
          />
        </div>
      )}
      {activity?.length ? <section className="mt-6 space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl">Propostas documentadas</h2>
        {activity.map(item=>{
          const data=item.data as {conditions?:string;deposit?:number;financing?:string;validUntil?:string;closingDate?:string;feedback?:string};
          return <article key={item.id} className="space-y-1 border-t pt-3 text-sm">
            <p className="font-medium">{new Date(item.occurred_at).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"})} · {Number(item.amount).toLocaleString("pt-PT")} €</p>
            {data.deposit!=null&&<p>Sinal previsto: {data.deposit.toLocaleString("pt-PT")} €</p>}
            {data.financing&&data.financing!=="por_definir"&&<p>Financiamento: {data.financing.replaceAll("_"," ")}</p>}
            {data.validUntil&&<p>Validade: {data.validUntil}</p>}
            {data.closingDate&&<p>Escritura pretendida: {data.closingDate}</p>}
            {data.conditions&&<p className="whitespace-pre-wrap">Condições: {data.conditions}</p>}
            {data.feedback&&<p className="whitespace-pre-wrap">Feedback: {data.feedback}</p>}
            {canDownload&&<a className="inline-block underline" href={`/api/property-activity/document?id=${item.id}`}>Descarregar {item.document_name}</a>}
          </article>;
        })}
      </section>:null}
    </div>
  );
}
