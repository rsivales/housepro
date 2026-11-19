import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { HelixShell } from "@/components/helix/helix-shell";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
 const session=await getSession();if(!session)redirect("/entrar");if(!isStaff(session.agent))redirect("/app");
 return <HelixShell>{children}</HelixShell>;
}
