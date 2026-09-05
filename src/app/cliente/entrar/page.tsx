"use client";

import * as React from "react";
import { Heart, Mail, Loader2, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Entrada do comprador (portal público). Sem passwords: recebe um link de
 * acesso por e-mail (magic link). Ao entrar, os favoritos ficam guardados na
 * conta e sincronizam entre dispositivos.
 */
export default function ClienteEntrarPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Link expirado/inválido ou aberto noutro dispositivo (?erro=link).
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro") === "link") {
      setError("O link expirou ou foi aberto noutro dispositivo. Peça um novo e abra-o no mesmo telemóvel/computador onde o pediu.");
    }
  }, []);

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
          Entre com o seu e-mail para guardar favoritos, receber alertas e
          acompanhar as suas visitas — em qualquer dispositivo.
        </p>

        {sent ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="size-6" />
            </div>
            <p className="font-medium">Verifique o seu e-mail</p>
            <p className="text-sm text-muted-foreground">
              Enviámos um link de acesso para <strong>{email}</strong>. Abra-o
              neste dispositivo para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.pt" autoComplete="email" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
