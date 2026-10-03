import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listDeals } from "@/lib/db/deals";
import { listLeadsByAgent, listContactsByOwner, listAllContactsByType, listAgenciesReal, getPropertyById } from "@/lib/db/repo";
import { commissionLabel } from "@/lib/data/commission";
import { CrmTabs } from "@/components/app/crm-tabs";
import type { LeadCard } from "@/components/app/leads-board";

export const metadata: Metadata = { title: "CRM · Pipelines" };

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const staff = isStaff(session.agent);
  const { propertyId } = await searchParams;

  const [deals, leadRows, contacts, agencyList, prefillProperty] = await Promise.all([
    listDeals(session.agent.id, staff),
    listLeadsByAgent(session.agent.id),
    // Staff precisa de ver compradores de toda a equipa para conseguir ligar
    // qualquer negócio a um contacto — não só os que tem na sua carteira.
    staff ? listAllContactsByType("comprador") : listContactsByOwner(session.agent.id),
    listAgenciesReal(),
    propertyId ? getPropertyById(propertyId) : Promise.resolve(undefined),
  ]);
  const buyerContacts = contacts
    .filter((c) => c.type === "comprador")
    .map((c) => ({ id: c.id, name: c.name }));
  // Outras agências (para "partilha com outra agência") — exclui a própria.
  const agencies = agencyList
    .filter((ag) => ag.id !== session.agent.agencyId)
    .map((ag) => ({ id: ag.id, name: ag.name }));

  // Veio de "Criar negócio" na ficha do imóvel: pré-preenche referência,
  // valor e vendedor — tudo ligado pelo id do imóvel, nunca por texto livre.
  const prefill = prefillProperty
    ? {
        propertyId: prefillProperty.id,
        reference: prefillProperty.reference,
        amount: prefillProperty.price,
        sellerName: prefillProperty.ownerName ?? "",
        commissionPreview: commissionLabel(prefillProperty.price, {
          commissionType: prefillProperty.commissionType,
          commissionPct: prefillProperty.commissionPct,
          commissionFixed: prefillProperty.commissionFixed,
        }),
      }
    : undefined;

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
      <CrmTabs deals={deals} leads={leads} buyerContacts={buyerContacts} agencies={agencies} prefill={prefill} canManage={staff} />
    </div>
  );
}
