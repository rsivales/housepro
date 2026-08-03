import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { getAfilhadosTree } from "@/lib/db/repo";
import { EquipaView } from "@/components/afilhados/equipa-view";

export const metadata: Metadata = { title: "A minha equipa" };

export default async function EquipaPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const root = await getAfilhadosTree(agent.id, `${agent.name.split(" ")[0]} (eu)`);

  return <EquipaView root={root} />;
}
