import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

/** Configuração editorial global: exclusiva da conta Super Admin. */
export default async function WebsiteAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isSuperadmin(session.agent)) redirect("/admin");
  return children;
}
