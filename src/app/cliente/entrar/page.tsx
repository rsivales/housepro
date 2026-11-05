"use client";

import * as React from "react";
import { Heart, Mail, Loader2, Check, ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Entrada do comprador: Google em dois passos quando o fornecedor está ativo,
 * com link de e-mail como alternativa. Sem passwords para recordar.
 */
export default function ClienteEntrarPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = React.useState(false);
  const [emailMode, setEmailMode] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  // Link expirado/inválido ou aberto noutro dispositivo (?erro=link).
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro") === "link") {
      setError("O link expirou ou foi aberto noutro dispositivo. Peça um novo e abra-o no mesmo telemóvel/computador onde o pediu.");
    }
    if (new URLSearchParams(window.location.search).get("erro") === "google") {
      setError("Não foi possível entrar com o Google. Tente novamente ou use o e-mail.");
    }
    fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers) => setGoogleAvailable(providers.google === true))
      .catch(() => setGoogleAvailable(false));
  }, []);

  async function signInWithGoogle() {
    if (!configured || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/cliente/favoritos` },
      });
      if (error) throw error;
      // A SDK navega para o Google; não libertar o botão antes da navegação.
    } catch {
      setError("Não foi possível entrar com o Google. Tente novamente ou use o e-mail.");
      setGoogleLoading(false);
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("A conta liga quando o Supabase estiver configurado. Entretanto os favoritos ficam neste dispositivo.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/cliente/favoritos` },
      });
      if (error) setError(error.message || "Não foi possível enviar o link.");
      else setSent(true);
    } catch {
      setError("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-6" />
        </div>
        <h1 className="mt-4 text-center font-display text-3xl">A minha conta</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Guarde os seus favoritos e acompanhe o processo de compra em qualquer dispositivo.
        </p>

        {sent ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="size-6" />
            </div>
            <p className="font-medium">Veja o seu e-mail</p>
            <p className="text-sm text-muted-foreground">
              Enviámos um link de acesso para <strong>{email}</strong>. Abra-o
              neste dispositivo para entrar.
            </p>
            <p className="text-xs text-muted-foreground">Se não o encontrar, procure também em Spam ou Promoções.</p>
            <button type="button" onClick={() => { setSent(false); setError(null); }} className="mt-2 text-sm font-medium text-primary underline">Corrigir e-mail ou pedir novo link</button>
          </div>
        ) : googleAvailable && !emailMode ? (
          <div className="mt-8 space-y-4">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="button" variant="outline" className="min-h-12 w-full gap-3 bg-white" onClick={signInWithGoogle} disabled={googleLoading}>
              {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <span aria-hidden="true" className="text-lg font-bold text-[#4285F4]">G</span>}
              Continuar com Google
            </Button>
            <button type="button" className="min-h-11 w-full text-sm font-medium text-primary underline" onClick={() => { setEmailMode(true); setError(null); }}>Entrar com e-mail</button>
            <p className="text-center text-xs text-muted-foreground">Ao entrar, aceita a <a href="/privacidade" className="font-medium text-primary underline">Política de Privacidade</a>.</p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-8 space-y-4">
            {googleAvailable && <button type="button" onClick={() => { setEmailMode(false); setError(null); }} className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" /> Voltar</button>}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.pt" autoComplete="email" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Receber link de acesso
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sem palavras-passe. Ao entrar, aceita a{" "}
              <a href="/privacidade" className="font-medium text-primary hover:underline">Política de Privacidade</a>.
            </p>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
