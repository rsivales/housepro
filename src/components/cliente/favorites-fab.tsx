"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Heart3D } from "@/components/icons/heart-3d";
import { loadFavorites, currentFavorites } from "@/lib/cliente/favorites";

// Áreas privadas/profissionais onde não faz sentido mostrar.
const OCULTAR = [
  "/app",
  "/admin",
  "/entrar",
  "/auth",
  "/reuniao",
  "/processo",
  "/cliente",
];

export function FavoritesFab() {
  const pathname = usePathname() || "/";
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    loadFavorites().then((list) => setCount(list.length));
    const read = () => setCount(currentFavorites().length);
    window.addEventListener("storage", read);
    window.addEventListener("housepro:favoritos", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("housepro:favoritos", read);
    };
  }, [pathname]);

  const oculto = count === 0 || OCULTAR.some((r) => pathname.startsWith(r));
  if (oculto) return null;

  // Na página do imóvel há a barra do agente em baixo (mobile): sobe o FAB.
  const naPaginaImovel = pathname.startsWith("/imovel/");

  return (
    <Link
      href="/cliente/favoritos"
      aria-label={`Ver os meus favoritos (${count})`}
      className={cn(
        "fixed right-4 z-40 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2.5 text-sm font-bold text-foreground shadow-xl transition-transform hover:scale-105 active:scale-95 sm:right-6",
        naPaginaImovel ? "bottom-24 lg:bottom-6" : "bottom-6"
      )}
    >
      <Heart3D className="size-7" />
      <span className="min-w-5 pr-1 text-center tabular-nums">{count}</span>
    </Link>
  );
}
