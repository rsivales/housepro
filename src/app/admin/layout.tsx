import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";

/**
 * Administração — aplica o escopo visual Helix e restringe o acesso: só
 * coordenação e acima (coordenador/diretor/admin/superadmin) entram. Um agente
 * é reencaminhado para o Helix. (Em modo demo respeita o papel do RoleSwitcher.)
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isStaff(session.agent)) redirect("/app");
  return <div className="helix min-h-dvh">{children}</div>;
}
