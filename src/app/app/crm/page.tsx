import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listDeals } from "@/lib/db/deals";
import { CrmBoard } from "@/components/app/crm-board";

export const metadata: Metadata = { title: "CRM · Negócios" };

export default async function CrmPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const deals = await listDeals(session.agent.id, isStaff(session.agent));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CrmBoard initial={deals} />
    </div>
  );
}
