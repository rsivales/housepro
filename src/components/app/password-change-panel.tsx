"use client";

import * as React from "react";
import { Check, KeyRound, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/** Qualquer consultor pode mudar a sua própria password a partir daqui —
 *  útil sobretudo depois de entrar com uma password temporária (criada ou
 *  reposta pela administração), que nunca tinha forma de ser trocada. */
export function PasswordChangePanel() {
  const [editing, setEditing] = React.useState(false);
  const [pass, setPass] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function save() {
    setErr(null);
    if (pass.length < 8) { setErr("A password deve ter pelo menos 8 caracteres."); return; }
    if (pass !== confirm) { setErr("As duas passwords não coincidem."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) { setErr("Não foi possível alterar: " + error.message); return; }
      setEditing(false);
      setPass("");
      setConfirm("");
      setOk(true);
      setTimeout(() => setOk(false), 4000);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]"
        >
          <KeyRound className="size-4" /> Alterar password
        </button>
        {ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="size-4" /> Password alterada.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--hx-border)" }}>
      <label className="block text-sm">
        Nova password
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
          autoComplete="new-password"
        />
      </label>
      <label className="mt-3 block text-sm">
        Confirmar nova password
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
          autoComplete="new-password"
        />
      </label>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar
        </button>
        <button
          onClick={() => { setEditing(false); setPass(""); setConfirm(""); setErr(null); }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
