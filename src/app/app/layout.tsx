import { getSession } from "@/lib/supabase/auth";
import { RoleSwitcher } from "@/components/admin/role-switcher";
import { AppHeader } from "@/components/helix/app-header";
import { HelixSidebar } from "@/components/helix/helix-sidebar";
import { MobileBottomNavigation } from "@/components/helix/bottom-nav";
import { agencyById } from "@/lib/data/mock";

/**
 * Layout da área profissional — shell Helix UNIFORME para todos os módulos:
 * escopo `.helix` (remapeia os tokens do sistema para a paleta Helix, por isso
 * todas as páginas ficam com o novo design), cabeçalho global, barra lateral
 * (desktop) e navegação inferior (mobile). Em modo demo monta o RoleSwitcher.
 *
 * As páginas continuam a controlar o seu próprio conteúdo/largura; o layout só
 * fornece a moldura comum.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Sem sessão (Supabase sem login): a página trata do redirect; não montamos a
  // moldura (que precisa do agente) para evitar erros.
  if (!session) return <>{children}</>;

  const { agent, demo } = session;

  return (
    <div className="helix min-h-dvh">
      <AppHeader
        name={agent.name}
        photo={agent.photo}
        agency={agent.agency}
        code={agent.code != null ? `#${agent.code}` : agencyById(agent.agencyId)?.region}
        hasUnread
      />
      <HelixSidebar />
      <div className="lg:pl-[76px]">
        <div className="pb-24 lg:pb-8">{children}</div>
      </div>
      <MobileBottomNavigation />
      {demo && <RoleSwitcher currentId={agent.id} />}
    </div>
  );
}
