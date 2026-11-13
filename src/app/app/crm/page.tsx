import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listDeals } from "@/lib/db/deals";
import { listLeadsByAgent, listAgenciesReal, getPropertyById } from "@/lib/db/repo";
import { commissionLabel } from "@/lib/data/commission";
import { CrmTabs } from "@/components/app/crm-tabs";
import type { LeadCard } from "@/components/app/leads-board";

import { crmLeadPipelines } from "@/lib/db/crm-lead-pipelines";
import { hasPipelinePhone } from "@/lib/data/lead-pipelines";

export const metadata: Metadata = { title: "CRM · Pipelines" };

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const staff = isStaff(session.agent);
  const { propertyId } = await searchParams;

  const [deals, leadRows, agencyList, prefillProperty, pipelines] = await Promise.all([
    listDeals(session.agent.id, staff, {agencyId:session.agent.agencyId,global:["superadmin","admin"].includes(session.agent.roleKey??"")}),
    listLeadsByAgent(session.agent.id),
    listAgenciesReal(),
    propertyId ? getPropertyById(propertyId) : Promise.resolve(undefined),
    crmLeadPipelines(session.agent, session.demo),
  ]);
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
          operation: prefillProperty.operation,
          commissionJustification: prefillProperty.commissionJustification,
          commissionType: prefillProperty.commissionType,
          commissionPct: prefillProperty.commissionPct,
          commissionFixed: prefillProperty.commissionFixed,
        }),
      }
    : undefined;

  const leads: LeadCard[] = leadRows.filter((lead) => hasPipelinePhone(lead.contact)).map((l) => ({
    id: l.id,
    archived: Boolean(l.crmArchivedAt),
    name: l.name,
    contact: l.contact,
    email: l.email,
    propertyId: l.propertyId,
    propertyRef: l.propertyRef,
    propertyImage: l.propertyImage,
    pipeline: l.pipeline,
    stage: l.stage,
    source: l.source,
    message: l.message,
    intent: l.intent,
    zone: l.zone,
    budget: l.budget,
    qualification: l.qualification,
    score: l.score,
    campaignId: l.campaignId,
    formId: l.formId,
    createdAt: l.createdAt,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CrmTabs deals={deals} leads={leads} pipelines={pipelines} agencies={agencies} prefill={prefill} canManage={staff} />
    </div>
  );
}
