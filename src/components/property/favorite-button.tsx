"use client";

import * as React from "react";
import { Heart, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botão de favorito para o VISITANTE (comprador). Sem conta → abre o registo
 * (criar conta grátis) e guarda o imóvel; com conta → alterna o favorito.
 * variant "icon" (coração no cartão) | "labeled" (botão na página do imóvel).
 * Demo com localStorage; liga ao Supabase (Portal do comprador) no M8.
 */

const CONTA_KEY = "housepro:conta";
const FAV_KEY = "housepro:favoritos";

function temConta() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(CONTA_KEY));
}
function lerFavoritos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

export function FavoriteButton({
  propertyId,
  variant = "icon",
}: {
  propertyId: string;
  variant?: "icon" | "labeled";
}) {
  const [fav, setFav] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    setFav(lerFavoritos().includes(propertyId));
  }, [propertyId]);

  function toggle() {
    const ids = lerFavoritos();
    const next = ids.includes(propertyId)
      ? ids.filter((i) => i !== propertyId)
      : [...ids, propertyId];
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
    setFav(next.includes(propertyId));
  }

  function onHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!temConta()) {
      setDialog(true);
      return;
    }
    toggle();
  }

  function criarConta(e: React.FormEvent) {
    e.preventDefault();
    window.localStorage.setItem(
      CONTA_KEY,
      JSON.stringify({ nome, email, criadoEm: Date.now() })
    );
    setDialog(false);
    toggle();
  }

  const dialogEl = dialog ? (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Fechar"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={() => setDialog(false)}
      />
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <button
          aria-label="Fechar"
          onClick={() => setDialog(false)}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-6" />
        </div>
        <h2 className="mt-4 text-center font-display text-xl">
          Guarde os seus imóveis
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Crie a sua conta gratuita para guardar favoritos, receber alertas de
          novos imóveis e acompanhar as suas visitas.
        </p>
        <form onSubmit={criarConta} className="mt-5 space-y-3">
          <input
            required
            type="text"
            name="nome"
            autoComplete="name"
            inputMode="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="O seu nome"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="O seu email"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            Criar conta grátis
          </button>
        </form>
      </div>
    </div>
  ) : null;

  if (variant === "labeled") {
    return (
      <>
        <button
          type="button"
          onClick={onHeart}
          aria-pressed={fav}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Heart
            className={cn("size-4", fav && "fill-destructive stroke-destructive")}
          />
          {fav ? "Guardado nos favoritos" : "Guardar nos favoritos"}
        </button>
        {dialogEl}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onHeart}
        aria-pressed={fav}
        aria-label={fav ? "Remover dos favoritos" : "Guardar nos favoritos"}
        className="pointer-events-auto grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
      >
        <Heart
          className={cn(
            "size-[18px] transition-all",
            fav ? "fill-destructive stroke-destructive scale-110" : "stroke-current"
          )}
        />
      </button>
      {dialogEl}
    </>
  );
}
