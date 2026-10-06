"use client";

import * as React from "react";
import { Check, Loader2, User, X } from "lucide-react";

interface ProfileRequest {
  id: string;
  profileId: string;
  currentName: string;
  currentEmail: string;
  currentPhoto: string | null;
  currentWhatsapp: string | null;
  currentPublicTitle: string | null;
  proposedName: string | null;
  proposedPhoto: string | null;
  proposedWhatsapp: string | null;
  proposedPublicTitle: string | null;
  createdAt: string;
  currentBanner: string | null;
  proposedBanner: string | null;
  bannerChanged: boolean;
}

/** Fila de pedidos de alteração de perfil (nome/foto/WhatsApp) — aprova ou recusa. */
export function ProfileRequestsQueue() {
  const [items, setItems] = React.useState<ProfileRequest[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [decisionError, setDecisionError] = React.useState<string | null>(null);
  const [state, setState] = React.useState<"ok" | "forbidden" | "no_service" | "error">("ok");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/profile-requests");
      if (res.status === 403) { setState("forbidden"); return; }
      if (res.status === 501) { setState("no_service"); return; }
      if (!res.ok) { setState("error"); return; }
      const j = await res.json();
      setItems(j.requests ?? []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function decide(id: string, decision: "aprovado" | "recusado") {
    setBusy(id);
    setDecisionError(null);
    try {
      const res = await fetch("/api/admin/profile-requests/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      if (res.ok) await load();
      else setDecisionError("Não foi possível guardar a decisão. Atualiza a fila e tenta novamente.");
    } catch { setDecisionError("Falha de ligação. A decisão não foi confirmada."); } finally {
      setBusy(null);
    }
  }

  if (state === "forbidden") return null;
  if (state === "no_service" || state === "error") return <p role="alert" className="mt-8 text-sm text-destructive">Não foi possível carregar os pedidos de perfil. <button onClick={load} className="underline">Tentar novamente</button></p>;
  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
        <User className="size-5 text-primary" /> Alterações de perfil pendentes ({items.length})
      </h2>
      {decisionError && <p role="alert" className="mb-3 text-sm text-destructive">{decisionError}</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{r.currentName}</p>
                <p className="text-xs text-muted-foreground">{r.currentEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide(r.id, "recusado")}
                  disabled={busy === r.id}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <X className="size-3.5" /> Recusar
                </button>
                <button
                  onClick={() => decide(r.id, "aprovado")}
                  disabled={busy === r.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Aprovar
                </button>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {r.proposedName && (
                <div className="flex flex-wrap gap-1.5">
                  <dt className="text-muted-foreground">Nome:</dt>
                  <dd><span className="text-muted-foreground line-through">{r.currentName}</span> → <strong>{r.proposedName}</strong></dd>
                </div>
              )}
              {r.proposedWhatsapp && (
                <div className="flex flex-wrap gap-1.5">
                  <dt className="text-muted-foreground">WhatsApp:</dt>
                  <dd><span className="text-muted-foreground line-through">{r.currentWhatsapp || "—"}</span> → <strong>{r.proposedWhatsapp}</strong></dd>
                </div>
              )}
              {r.proposedPublicTitle && (
                <div className="flex flex-wrap gap-1.5">
                  <dt className="text-muted-foreground">Alias público:</dt>
                  <dd><span className="text-muted-foreground line-through">{r.currentPublicTitle || "—"}</span> → <strong>{r.proposedPublicTitle}</strong></dd>
                </div>
              )}
              {r.proposedPhoto && (
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">Foto proposta:</dt>
                  <dd>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.proposedPhoto} alt="" className="size-24 rounded-lg object-contain" />
                  </dd>
                </div>
              )}
              {r.bannerChanged && (
                <div className="pt-3">
                  <dt className="mb-2 text-muted-foreground">Banner: {r.proposedBanner ? "nova imagem proposta" : "remover e usar fundo HousePro"}</dt>
                  <dd className="grid gap-3 sm:grid-cols-2">
                    {r.currentBanner && <figure>
                      <p className="mb-1 text-sm">Atual</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.currentBanner} alt="Banner atual" className="aspect-[12/5] w-full rounded-lg object-cover" />
                    </figure>}
                    {r.proposedBanner && <figure>
                      <p className="mb-1 text-sm">Proposto</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.proposedBanner} alt="Banner proposto" className="aspect-[12/5] w-full rounded-lg object-cover" />
                    </figure>}
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
