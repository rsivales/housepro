import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getClientPortalProfile } from "@/lib/db/client-portal";
import { PortalRolePicker } from "@/components/cliente/portal-role-picker";

export const metadata: Metadata = { title: "A sua área pessoal", robots: { index: false, follow: false } };

export default async function EscolherPerfilPage() {
  if (!isSupabaseConfigured()) redirect("/cliente/entrar");
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) redirect("/cliente/entrar");

  const profile = await getClientPortalProfile(user.id, user.email);
  if (profile?.role) redirect(`/cliente/${profile.role}`);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <PortalRolePicker />
      <SiteFooter />
    </div>
  );
}
