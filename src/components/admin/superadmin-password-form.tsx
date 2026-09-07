"use client";

import * as React from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type SaveState = "idle" | "saving" | "saved" | "error";

export function SuperadminPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, setState] = React.useState<SaveState>("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const strong = Object.values(checks).every(Boolean);

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!strong) {
      setState("error");
      setMessage("A palavra-passe ainda não cumpre todos os requisitos.");
      return;
    }
    if (password !== confirmation) {
      setState("error");
      setMessage("As duas palavras-passe não coincidem.");
      return;
    }

    setState("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setState("error");
      setMessage(error.message || "Não foi possível alterar a palavra-passe. Entre novamente por link e tente outra vez.");
      return;
    }

    setPassword("");
    setConfirmation("");
    setState("saved");
    setMessage("Palavra-passe definida com sucesso. Já pode entrar com email e palavra-passe.");
  }

  return (
    <form onSubmit={savePassword} className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h2 className="font-medium">Definir ou alterar palavra-passe</h2>
          <p className="mt-1 text-sm text-muted-foreground">Conta: {email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="new-password">Nova palavra-passe</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (state !== "idle") setState("idle");
            }}
            autoComplete="new-password"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="confirm-password">Confirmar palavra-passe</Label>
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            if (state !== "idle") setState("idle");
          }}
          autoComplete="new-password"
          required
        />
      </div>

      <ul className="mt-4 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <Requirement ok={checks.length}>12 ou mais caracteres</Requirement>
        <Requirement ok={checks.upper}>Uma letra maiúscula</Requirement>
        <Requirement ok={checks.lower}>Uma letra minúscula</Requirement>
        <Requirement ok={checks.number}>Um número</Requirement>
        <Requirement ok={checks.symbol}>Um símbolo</Requirement>
      </ul>

      {message && (
        <div
          role={state === "error" ? "alert" : "status"}
          className={`mt-5 rounded-xl border p-3 text-sm ${
            state === "saved"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          {message}
        </div>
      )}

      <Button type="submit" variant="brand" className="mt-5 w-full" disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {state === "saving" ? "A guardar…" : "Guardar palavra-passe"}
      </Button>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        A palavra-passe é enviada diretamente ao serviço de autenticação e nunca é guardada no site. O link por email continua disponível como alternativa de acesso.
      </p>
    </form>
  );
}

function Requirement({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-emerald-700" : ""}`}>
      <CheckCircle2 className="size-3.5" aria-hidden="true" /> {children}
    </li>
  );
}
