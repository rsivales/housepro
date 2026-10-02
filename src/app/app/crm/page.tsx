import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listDeals } from "@/lib/db/deals";
import { listLeadsByAgent, listContactsByOwner, listAgenciesReal } from "@/lib/db/repo";
import { CrmTabs } from "@/components/app/crm-tabs";
import type { LeadCard } from "@/components/app/leads-board";

export const metadata: Metadata = { title: "CRM · Pipelines" };

export default async function CrmPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [deals, leadRows, contacts, agencyList] = await Promise.all([
    listDeals(session.agent.id, isStaff(session.agent)),
    listLeadsByAgent(session.agent.id),
    listContactsByOwner(session.agent.id),
    listAgenciesReal(),
  ]);
  const buyerContacts = contacts
    .filter((c) => c.type === "comprador")
    .map((c) => ({ id: c.id, name: c.name }));
  // Outras agências (para "partilha com outra agência") — exclui a própria.
  const agencies = agencyList
    .filter((ag) => ag.id !== session.agent.agencyId)
    .map((ag) => ({ id: ag.id, name: ag.name }));

  const leads: LeadCard[] = leadRows.map((l) => ({
    id: l.id,
    name: l.name,
    contact: l.contact,
    propertyId: l.propertyId,
    propertyRef: l.propertyRef,
    propertyImage: l.propertyImage,
    pipeline: l.pipeline,
    stage: l.stage,
    source: l.source,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CrmTabs deals={deals} leads={leads} buyerContacts={buyerContacts} agencies={agencies} />
    </div>
  );
}
