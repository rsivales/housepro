import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FavoritesList } from "@/components/cliente/favorites-list";

export const metadata: Metadata = { title: "Os meus favoritos" };

export default function FavoritosPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-primary">A minha conta</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          Os meus favoritos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os imóveis que guardou com o ♥, reunidos num só sítio.
        </p>
        <FavoritesList />
      </main>
      <SiteFooter />
    </div>
  );
}
