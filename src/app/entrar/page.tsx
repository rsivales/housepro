"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BarChart3, Eye, EyeOff, Home, KeyRound, Lock, Mail, Menu, Star, X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Logo } from "@/components/brand/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const YEAR = new Date().getFullYear();

const FEATURES = [
  { icon: BarChart3, title: "Equipa dedicada", sub: "" },
  { icon: Star, title: "Conhecimento", sub: "que faz a diferença" },
  { icon: Home, title: "Mais oportunidades", sub: "mais histórias" },
];

/** Watermark decorativo — recorta só a andorinha do logótipo oficial
 *  (public/brand/housepro-logo.png), sem inventar um novo símbolo. */
function BirdWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 -top-16 h-[560px] w-[560px] overflow-hidden opacity-[0.06] grayscale"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- recorte por pixel exato (object-fit não serve para isto) */}
      <img
        src="/brand/housepro-logo.png"
        alt=""
        className="absolute max-w-none"
        style={{ top: "-20px", left: "-1950px", width: "2450px", height: "auto" }}
      />
    </div>
  );
}

export default function EntrarPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [padrinho, setPadrinho] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Já autenticado? Reencaminha direto para o Helix (evita pedir login de novo
  // quando o profissional volta do website público com sessão ativa).
  React.useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/app");
    });
  }, [configured, router]);

  // Link de acesso expirado/inválido ou aberto noutro dispositivo.
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro") === "link") {
      setError("O link de acesso expirou ou foi aberto noutro dispositivo. Peça um novo e abra-o no mesmo dispositivo onde o pediu.");
    }
  }, []);

  // Lê o código de padrinho do link (?padrinho=) e guarda-o para ser resgatado
  // automaticamente ao entrar (sobrevive ao magic-link por email).
  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("padrinho");
    if (code) {
      setPadrinho(code.toUpperCase());
      try { localStorage.setItem("housepro:padrinho", code.toUpperCase()); } catch {}
    }
  }, []);

  /** Mensagem legível a partir de um erro do Supabase (evita mostrar "{}"). */
  function readError(err: unknown): string {
    const e = err as { message?: string; name?: string; status?: number } | null;
    const msg = (e?.message ?? "").trim();
    if (msg && msg !== "{}" && msg !== "[object Object]") return msg;
    // Erro sem mensagem útil → quase sempre falha de ligação/configuração.
    return "Não foi possível ligar ao servidor. Confirma no Vercel o NEXT_PUBLIC_SUPABASE_URL (não pode ser o de exemplo) e faz um Redeploy novo.";
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Autenticação ainda não ligada — use o modo demo em baixo.");
      return;
    }
    setLoading(true);
    try {
      // "Manter sessão iniciada" desligado → cookie de sessão do navegador
      // (termina ao fechar o navegador) em vez do cookie persistente por defeito.
      const supabase = createClient({ rememberMe: remember });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Login error:", error);
        setError(readError(error));
      } else {
        router.push("/app");
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError(readError(err));
    } finally {
      setLoading(false);
    }
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
    if (error) setError(readError(error));
    else setSent(true);
  }

  async function sendPasswordReset() {
    setError(null);
    setResetSent(false);
    if (!configured) {
      setError("Autenticação ainda não ligada — use o modo demo em baixo.");
      return;
    }
    if (!email.trim()) {
      setError("Escreva primeiro o seu email, para enviarmos o link de recuperação.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/entrar/nova-password`,
    });
    setLoading(false);
    if (error) setError(readError(error));
    else setResetSent(true);
  }

  return (
    <div className="hp relative min-h-dvh overflow-hidden bg-background text-foreground">
      <BirdWatermark />

      {/* Cabeçalho — versão minimal, só o essencial para o acesso profissional. */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <Link href="/" aria-label="HousePro — início" className="flex items-end gap-2.5">
            <Logo className="h-8" />
            <span className="hidden translate-y-[1px] text-[0.62rem] font-semibold tracking-[0.22em] text-muted-foreground sm:inline">
              REAL ESTATE
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ModeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={menuOpen}
                className="grid size-9 place-items-center rounded-md text-foreground hover:bg-secondary"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
              {menuOpen && (
                <>
                  <button
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border bg-card py-1.5 shadow-lg">
                    <Link href="/" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={() => setMenuOpen(false)}>
                      Site público
                    </Link>
                    <Link href="/cliente/entrar" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={() => setMenuOpen(false)}>
                      Entrar como cliente
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <p className="hp-eyebrow">Área profissional</p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.08] sm:text-5xl">
          O lugar onde grandes resultados começam.
        </h1>
        <div className="mt-4 h-1 w-12 bg-destructive" />
        <p className="mt-5 max-w-md text-muted-foreground">
          Acesso de consultores e coordenação HousePro.
        </p>

        {padrinho && (
          <div className="mt-6 flex max-w-md items-start gap-2.5 rounded-xl border border-gold/40 bg-gold/10 p-3.5 text-sm">
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
          <div className="mt-6 max-w-md rounded-xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
            A autenticação liga quando o Supabase estiver configurado (ver{" "}
            <code className="rounded bg-background px-1">.env.example</code>).
            Entretanto pode ver a área em modo demo.
            <Button asChild variant="destructive" size="sm" className="mt-3 w-full">
              <Link href="/app">
                Ver área profissional (demo) <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-8 max-w-md rounded-2xl border bg-card p-7 shadow-sm sm:p-8">
          <form onSubmit={signInPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@housepro.pt"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {sent && (
              <p className="text-sm text-primary">
                Enviámos um link de acesso para o seu email.
              </p>
            )}
            {resetSent && (
              <p className="text-sm text-primary">
                Enviámos um link para definir uma nova palavra-passe.
              </p>
            )}

            <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
              Entrar <ArrowRight className="size-4" />
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={sendMagicLink}
              disabled={loading}
            >
              <Mail className="size-4" /> Receber link por email
            </Button>

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded accent-destructive"
                />
                Manter sessão iniciada
              </label>
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={loading}
                className="font-medium text-destructive hover:underline"
              >
                Esqueci a palavra-passe
              </button>
            </div>
          </form>
        </div>

        {/* Argumentos — reforço visual, sem números inventados. */}
        <div className="mt-14 flex max-w-2xl flex-wrap gap-x-10 gap-y-6">
          {FEATURES.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="size-5 text-muted-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {title}
                {sub && <span className="block font-normal normal-case tracking-normal text-muted-foreground">{sub}</span>}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>© {YEAR} HousePro. Todos os direitos reservados.</p>
          <p className="text-right font-semibold uppercase tracking-[0.14em] text-foreground">
            Imobiliário
            <br />
            <span className="relative inline-block">
              com um propósito.
              <span className="absolute -bottom-1 left-0 h-px w-full bg-destructive" />
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
