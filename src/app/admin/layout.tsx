import { redirect } from "next/navigation";

import { getSession } from "@/lib/supabase/auth";
import { isStaff, isSuperadmin, ROLE_LABEL } from "@/lib/data/roles";
import { RoleStatusBar } from "@/components/admin/role-status-bar";

/**
 * Administração — aplica o escopo visual Helix e restringe o acesso: só
 * coordenação e acima (coordenador/diretor/admin/superadmin) entram. Um agente
 * é reencaminhado para o Helix. (Em modo demo respeita o papel do RoleSwitcher.)
 *
 * O gate usa `session.agent` — o papel EFETIVO. Quando um Super Admin está a
 * "ver como" um papel sem acesso a /admin, é reencaminhado como esse papel
 * veria (comportamento correto da simulação); o controlo para sair da
 * visualização fica sempre acessível também em /app.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!isStaff(session.agent)) redirect("/app");

  const roleLabel = (session.agent.roleKey && ROLE_LABEL[session.agent.roleKey]) || session.agent.role || "Consultor";
  const canSwitch = isSuperadmin(session.realAgent ?? session.agent);

  return (
    <div className="helix min-h-dvh">
      {!session.demo && (
        <RoleStatusBar
          name={session.agent.name}
          roleLabel={roleLabel}
          canSwitch={canSwitch}
          viewingAs={Boolean(session.viewingAs)}
          realName={session.realAgent?.name}
        />
      )}
      {children}
    </div>
  );
}
