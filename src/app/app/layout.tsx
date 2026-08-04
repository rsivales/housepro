import { getSession } from "@/lib/supabase/auth";
import { RoleSwitcher } from "@/components/admin/role-switcher";

/**
 * Layout da área profissional. Em modo demo (protótipo) monta a vista de
 * supervisão do Super Admin, que permite navegar entre papéis.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <>
      {children}
      {session?.demo && <RoleSwitcher currentId={session.agent.id} />}
    </>
  );
}
