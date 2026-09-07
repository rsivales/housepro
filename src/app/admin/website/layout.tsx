import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

/** As definições do website global pertencem exclusivamente ao Super Admin. */
export default async function WebsiteAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  return children;
}
