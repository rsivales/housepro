"use client";

import * as React from "react";
import { Check, Copy, KeyRound, Mail, UserPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Botão + painel para gerar um convite de padrinhado (com código) e para
 *  resgatar um código recebido. */
export function Apadrinhar() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<{ code: string; link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function gerar() {
    setLoading(true);
    try {
      const res = await fetch("/api/sponsor/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const out = await res.json();
      if (res.ok && out.ok) setInvite(out);
    } finally {
      setLoading(false);
    }
  }
  function copy() {
    if (!invite) return;
    navigator.clipboard?.writeText(invite.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <UserPlus className="size-4" /> Apadrinhar consultor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-xl">
                <UserPlus className="size-5 text-primary" /> Apadrinhar consultor
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {!invite ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Geramos um <strong>código único</strong>. Quando o novo consultor o usar ao
                  criar a conta, fica ligado automaticamente à tua árvore — sem falhas.
                </p>
                <label className="mt-4 block text-sm font-medium">Email do convidado (opcional)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.pt"
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">Se indicares o email, enviamos-lhe o código automaticamente.</p>
                <Button className="mt-4 w-full" onClick={gerar} disabled={loading}>
                  {loading ? "A gerar…" : "Gerar código de convite"}
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {invite.emailed ? "Convite enviado por email. " : ""}Partilha este código com o consultor:
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl border bg-secondary/40 p-3">
                  <KeyRound className="size-5 text-primary" />
                  <span className="flex-1 font-mono text-lg font-semibold tracking-wide">{invite.code}</span>
                  <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs hover:bg-secondary">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <a
                  href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Convite HousePro")}&body=${encodeURIComponent(`Usa este código ao criar a tua conta: ${invite.code}\n${invite.link}`)}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Mail className="size-4" /> Enviar por email
                </a>
                <Button variant="outline" className="mt-4 w-full" onClick={() => { setInvite(null); setEmail(""); }}>
                  Gerar outro
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Campo para o consultor apadrinhado resgatar um código recebido. */
export function ResgatarCodigo() {
  const [code, setCode] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);

  async function resgatar() {
    if (!code.trim()) return;
    setState("loading");
    setMsg(null);
    try {
      const res = await fetch("/api/sponsor/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const out = await res.json();
      if (res.ok && out.ok) {
        setState("ok");
        setMsg(out.sponsorName ? `Ligado ao padrinho ${out.sponsorName}.` : "Código validado.");
      } else {
        setState("err");
        setMsg(out.error ?? "Não foi possível resgatar.");
      }
    } catch {
      setState("err");
      setMsg("Erro de ligação.");
    }
  }

  return (
    <div className="mt-4 rounded-xl border bg-secondary/30 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="size-4 text-primary" /> Tens um código de padrinho?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="HP-XXXX-XXXX"
          className="min-w-0 flex-1 font-mono"
          disabled={state === "loading" || state === "ok"}
        />
        <Button onClick={resgatar} disabled={state === "loading" || state === "ok" || !code.trim()}>
          {state === "loading" ? "A ligar…" : state === "ok" ? "Ligado" : "Resgatar"}
        </Button>
      </div>
      {msg && <p className={cn("mt-2 text-sm", state === "ok" ? "text-primary" : "text-destructive")}>{msg}</p>}
    </div>
  );
}
