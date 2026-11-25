"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, Loader2, Store } from "lucide-react";

const OPTIONS: { role: "comprador" | "vendedor" | "investidor"; icon: typeof Home; title: string; text: string }[] = [
  { role: "comprador", icon: Home, title: "Quero comprar", text: "Guardar favoritos e acompanhar o processo de compra." },
  { role: "vendedor", icon: Store, title: "Quero vender", text: "Acompanhar o meu imóvel e a venda em curso." },
  { role: "investidor", icon: Building2, title: "Quero investir", text: "Explorar oportunidades e acompanhar a carteira." },
];

export function PortalRolePicker() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function choose(role: string) {
    setBusy(role);
    setErr(null);
    try {
      const res = await fetch("/api/cliente/portal-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        setErr("Não foi possível guardar a sua escolha. Tente novamente.");
        return;
      }
      router.push(`/cliente/${role}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-3xl">Bem-vindo à sua área pessoal</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Para lhe mostrarmos o que importa, diga-nos o que procura. Pode mudar mais tarde nas definições da conta.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.role}
            type="button"
            onClick={() => choose(o.role)}
            disabled={busy !== null}
            className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition hover:border-primary/50 hover:shadow-md disabled:opacity-50"
          >
            {busy === o.role ? (
              <Loader2 className="size-7 animate-spin text-primary" />
            ) : (
              <o.icon className="size-7 text-primary" />
            )}
            <span className="font-semibold">{o.title}</span>
            <span className="text-xs text-muted-foreground">{o.text}</span>
          </button>
        ))}
      </div>
      {err && <p className="mt-4 text-center text-sm text-destructive">{err}</p>}
    </div>
  );
}
