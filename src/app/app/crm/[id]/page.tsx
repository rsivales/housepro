import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { getDeal } from "@/lib/db/deals";
import { listAgenciesReal } from "@/lib/db/repo";
import { DealDetailView } from "@/components/app/deal-detail";

export const metadata: Metadata = { title: "Negócio — Helix" };

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/entrar");

  const staff = isStaff(session.agent);
  const deal = await getDeal(id, session.agent.id, staff);
  if (!deal) notFound();

  const agencyList = await listAgenciesReal();
  const agencies = agencyList
    .filter((ag) => ag.id !== deal.agencyId)
    .map((ag) => ({ id: ag.id, name: ag.name }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/app/crm" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> CRM · Negócios
      </Link>
      <DealDetailView deal={deal} agencies={agencies} canManage={staff} />
    </div>
  );
}
