import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { ClientAreaShell } from "@/components/cliente/client-area-shell";
import { FavoritesList } from "@/components/cliente/favorites-list";
import { PortalNewsBanner } from "@/components/cliente/portal-news-banner";

export const metadata: Metadata = { title: "Os meus favoritos" };

/**
 * Favoritos só por dispositivo (sem conta). Quem já tem conta (magic link)
 * é encaminhado para /cliente/comprador, que mostra a identidade ("Olá,
 * nome") e os favoritos ligados à conta — sem isto, um cliente autenticado
 * acabava sempre aqui, numa página genérica sem confirmação de quem é.
 */
export default async function FavoritosPage() {
  if (isSupabaseConfigured()) {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) redirect("/cliente/comprador");
  }

  return (
    <ClientAreaShell active="comprador" eyebrow="A sua seleção" title="A casa certa merece ser guardada." description="Reúna os imóveis que lhe interessam e compare as opções antes de decidir." image="/imt/hero-algarve.webp">
      <section className="mt-7 rounded-[1.5rem] border border-[#dce3ec] bg-white p-5 sm:p-7 dark:border-white/15 dark:bg-white/5"><h2 className="font-display text-2xl font-semibold">Os meus imóveis guardados</h2><p className="mt-1 text-sm opacity-70">Pode explorar sem conta. Para manter os favoritos em vários dispositivos, <Link href="/cliente/entrar" className="font-semibold text-[#a31621] underline">entre com o seu email</Link>.</p><FavoritesList /></section>
      <PortalNewsBanner />
    </ClientAreaShell>
  );
}
