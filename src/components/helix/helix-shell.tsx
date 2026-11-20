import { OwnerReportSetupGate } from "@/components/property/owner-report-setup-gate";
import {WorkspaceSwitch} from "@/components/helix/workspace-switch";
import {agencyWorkspaces} from "@/lib/db/agency-finance";
import {isCommercialAgent} from "@/lib/data/agent-directory";
import { getSession } from "@/lib/supabase/auth";
import { notificationCounts } from "@/lib/db/repo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RoleSwitcher } from "@/components/admin/role-switcher";
import { RoleStatusBar } from "@/components/admin/role-status-bar";
import { AppHeader } from "@/components/helix/app-header";
import { HelixSidebar } from "@/components/helix/helix-sidebar";
import { MobileBottomNavigation } from "@/components/helix/bottom-nav";
import {getAgencyById} from "@/lib/db/repo";
import {consultantCode} from "@/lib/codes";
import { ReleaseNotice } from "@/components/helix/release-notice";
import { navigationAccess } from "@/lib/helix/navigation";
import { isSuperadmin, ROLE_LABEL } from "@/lib/data/roles";

/**
 * Layout da área profissional — shell Helix UNIFORME para todos os módulos:
 * escopo `.helix` (remapeia os tokens do sistema para a paleta Helix, por isso
 * todas as páginas ficam com o novo design), cabeçalho global, barra lateral
 * (desktop) e navegação inferior (mobile). Em modo demo monta o RoleSwitcher.
 *
 * As páginas continuam a controlar o seu próprio conteúdo/largura; o layout só
 * fornece a moldura comum.
 */
export async function HelixShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Sem sessão (Supabase sem login): a página trata do redirect; não montamos a
  // moldura (que precisa do agente) para evitar erros.
  if (!session) return <>{children}</>;

  const { agent, demo } = session;
  const superadmin = isSuperadmin(agent);
  const roleLabel = (agent.roleKey && ROLE_LABEL[agent.roleKey]) || agent.role || "Consultor";
  const canSwitch = isSuperadmin(session.realAgent ?? agent);
  // Indicador de não lidas: reflete notificações reais; nunca aceso por
  // omissão (evita sugerir contactos fictícios por atender).
  const unreadCount = isSupabaseConfigured() ? (await notificationCounts(agent.id)).unread : 0;
  const hasUnread = unreadCount > 0;

  const agency=agent.agencyId?await getAgencyById(agent.agencyId):undefined;
  let referenceCode:string|undefined;
  if(agency?.code!=null&&agent.code!=null){try{referenceCode=`${consultantCode(agency.code,agent.code,agency.referenceCityCode??1)}-`;}catch{/* An unassigned reference code must not block the professional workspace. */}}
  const hasBrokerWorkspace = !session.demo && (await agencyWorkspaces(session.agent)).some(a=>a.brokerId===session.agent.id || (session.agent.roleKey==="diretor" && a.id===session.agent.agencyId));
  return (
    <div className="helix min-h-dvh"><HelixSidebar access={navigationAccess(agent, hasBrokerWorkspace)}>
      {!demo && (
        <RoleStatusBar
          name={agent.name}
          roleLabel={roleLabel}
          canSwitch={canSwitch}
          viewingAs={Boolean(session.viewingAs)}
          realName={session.realAgent?.name}
        />
      )}
      <AppHeader
        name={agent.name}
        photo={agent.photo}
        agency={agent.agency}
        code={referenceCode}
        hasUnread={hasUnread}
        unreadCount={unreadCount}
      />
      <div>
        <div className="pb-24 lg:pb-8"><WorkspaceSwitch identity={{name:agent.name,photo:agent.photo,agency:agency?.name??agent.agency,referenceCode}} consultant={isCommercialAgent(agent)} broker={hasBrokerWorkspace} admin={superadmin || ["admin","diretor","coordenador"].includes(agent.roleKey??"")} />{children}</div>
      </div>
      <MobileBottomNavigation superadmin={superadmin&&!isCommercialAgent(agent)} />
      {!demo && !session.viewingAs && isCommercialAgent(agent) && <OwnerReportSetupGate />}
      <ReleaseNotice revision={process.env.VERCEL_GIT_COMMIT_SHA} />
      {demo && <RoleSwitcher currentId={agent.id} />}
      </HelixSidebar>
    </div>
  );
}

export default HelixShell;
