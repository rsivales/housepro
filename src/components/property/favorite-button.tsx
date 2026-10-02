"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Mail, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { loadFavorites, toggleFavorite, isLoggedIn } from "@/lib/cliente/favorites";

/**
 * Botão de favorito do VISITANTE (comprador). Guarda logo (localStorage sem
 * conta; Supabase com conta) e, na primeira vez sem conta, convida a entrar por
 * e-mail para sincronizar entre dispositivos. Variantes: "icon" (cartão),
 * "labeled" (página) e "icon-light" (hero).
 */

const INVITE_SEEN = "housepro:favInviteSeen";

export function FavoriteButton({
  propertyId,
  variant = "icon",
  onToggle,
}: {
  propertyId: string;
  variant?: "icon" | "labeled" | "icon-light";
  onToggle?: () => void;
}) {
  const [fav, setFav] = React.useState(false);
  const [invite, setInvite] = React.useState(false);

  React.useEffect(() => {
    loadFavorites().then((list) => setFav(list.includes(propertyId)));
    const sync = () => import("@/lib/cliente/favorites").then((m) => setFav(m.currentFavorites().includes(propertyId)));
    window.addEventListener("housepro:favoritos", sync);
    return () => window.removeEventListener("housepro:favoritos", sync);
  }, [propertyId]);

  async function onHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = await toggleFavorite(propertyId);
    setFav(nowFav);
    onToggle?.();
    // Convite (uma vez) a criar conta para sincronizar — só ao guardar e sem conta.
    if (nowFav && isLoggedIn() === false) {
      let seen = false;
      try { seen = Boolean(localStorage.getItem(INVITE_SEEN)); } catch {}
      if (!seen) {
        setInvite(true);
        try { localStorage.setItem(INVITE_SEEN, "1"); } catch {}
      }
    }
  }

  const inviteEl = invite ? (
    <div className="pointer-events-auto fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" onClick={() => setInvite(false)} />
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <button aria-label="Fechar" onClick={() => setInvite(false)} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="size-4" />
        </button>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-6" />
        </div>
        <h2 className="mt-4 text-center font-display text-xl">Guardado ♥</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Crie a sua conta gratuita (só e-mail) para manter os favoritos em
          qualquer dispositivo e receber alertas.
        </p>
        <Link href="/cliente/entrar" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01]">
          <Mail className="size-4" /> Entrar com e-mail
        </Link>
        <button onClick={() => setInvite(false)} className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
          Agora não
        </button>
      </div>
    </div>
  ) : null;

  if (variant === "labeled") {
    return (
      <>
        <button type="button" onClick={onHeart} aria-pressed={fav} className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
          <Heart className={cn("size-4", fav && "fill-destructive stroke-destructive")} />
          {fav ? "Guardado nos favoritos" : "Guardar nos favoritos"}
        </button>
        {inviteEl}
      </>
    );
  }

  if (variant === "icon-light") {
    return (
      <>
        <button type="button" onClick={onHeart} aria-pressed={fav} aria-label={fav ? "Remover dos favoritos" : "Guardar nos favoritos"} className="pointer-events-auto grid size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10">
          <Heart className={cn("size-5 transition-all", fav ? "fill-destructive stroke-destructive scale-110" : "stroke-current")} />
        </button>
        {inviteEl}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={onHeart} aria-pressed={fav} aria-label={fav ? "Remover dos favoritos" : "Guardar nos favoritos"} className="pointer-events-auto grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background">
        <Heart className={cn("size-[18px] transition-all", fav ? "fill-destructive stroke-destructive scale-110" : "stroke-current")} />
      </button>
      {inviteEl}
    </>
  );
}
