"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";

const FAV_KEY = "housepro:favoritos";

// Onde NÃO mostrar (áreas privadas/profissionais e onde já há acesso direto).
const OCULTAR = [
  "/app",
  "/admin",
  "/entrar",
  "/auth",
  "/reuniao",
  "/processo",
  "/imovel/",
  "/cliente",
];

export function FavoritesFab() {
  const pathname = usePathname() || "/";
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const read = () => {
      try {
        const ids = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
        setCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("housepro:favoritos", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("housepro:favoritos", read);
    };
  }, [pathname]);

  const oculto = count === 0 || OCULTAR.some((r) => pathname.startsWith(r));
  if (oculto) return null;

  return (
    <Link
      href="/cliente/favoritos"
      aria-label={`Ver os meus favoritos (${count})`}
      className="fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 sm:right-6"
    >
      <Heart className="size-5 fill-current" />
      <span className="min-w-4 text-center tabular-nums">{count}</span>
    </Link>
  );
}
