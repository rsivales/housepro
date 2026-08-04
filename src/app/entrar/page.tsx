"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EntrarPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [padrinho, setPadrinho] = React.useState("");

  // Lê o código de padrinho do link (?padrinho=) e guarda-o para ser resgatado
  // automaticamente ao entrar (sobrevive ao magic-link por email).
  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("padrinho");
    if (code) {
      setPadrinho(code.toUpperCase());
      try { localStorage.setItem("housepro:padrinho", code.toUpperCase()); } catch {}
    }
  }, []);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Autenticação ainda não ligada — use o modo demo em baixo.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/app");
  }

  async function sendMagicLink() {
    setError(null);
    if (!configured) {
      setError("Autenticação ainda não ligada — use o modo demo em baixo.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl">Área profissional</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesso de consultores e coordenação HousePro.
        </p>

        {padrinho && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-gold/40 bg-gold/10 p-3.5 text-sm">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-gold" />
            <div>
              <p className="font-medium">Convite de padrinho <span className="font-mono">{padrinho}</span></p>
              <p className="mt-0.5 text-muted-foreground">
                Ao entrar, ficas automaticamente ligado à equipa do teu padrinho.
              </p>
            </div>
          </div>
        )}

        {!configured && (
          <div className="mt-6 rounded-xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
            A autenticação liga quando o Supabase estiver configurado (ver{" "}
            <code className="rounded bg-background px-1">.env.example</code>).
            Entretanto pode ver a área em modo demo.
            <Button asChild variant="brand" size="sm" className="mt-3 w-full">
              <Link href="/app">
                Ver área profissional (demo) <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}

        <form onSubmit={signInPassword} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@housepro.pt"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && (
            <p className="text-sm text-primary">
              Enviámos um link de acesso para o seu email.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            Entrar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={sendMagicLink}
            disabled={loading}
          >
            <Mail className="size-4" /> Receber link por email
          </Button>
        </form>
      </main>
    </div>
  );
}
