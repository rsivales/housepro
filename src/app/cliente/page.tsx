import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getClientPortalProfile } from "@/lib/db/client-portal";

export default async function ClientePage() {
  if (!isSupabaseConfigured()) redirect("/cliente/entrar");
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) redirect("/cliente/entrar");

  const profile = await getClientPortalProfile(user.id, user.email);
  redirect(profile?.role ? `/cliente/${profile.role}` : "/cliente/escolher-perfil");
}
