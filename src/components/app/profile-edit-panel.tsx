"use client";

import * as React from "react";
import { Camera, Clock, Loader2, Pencil, Send, X, XCircle } from "lucide-react";

import { AgentAvatar } from "@/components/brand/agent-avatar";
import { uploadErrorMessage, uploadSiteImage } from "@/lib/data/site-content";
import type { Agent } from "@/lib/data/types";

export interface PendingProfileRequest {
  name: string | null;
  photoUrl: string | null;
  whatsapp: string | null;
  createdAt: string;
}

/**
 * Edição do próprio perfil (nome, foto, WhatsApp) — não grava direto: envia um
 * pedido que fica pendente até a coordenação/administração aprovar (ver
 * /admin/aprovacoes). Enquanto houver um pedido pendente, mostra-o em vez do
 * formulário e permite cancelá-lo.
 */
export function ProfileEditPanel({ agent, initialPending }: { agent: Agent; initialPending: PendingProfileRequest | null }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(agent.name);
  const [whatsapp, setWhatsapp] = React.useState(agent.whatsapp ?? "");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingProfileRequest | null>(initialPending);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      let photoUrl: string | undefined;
      if (photoFile) photoUrl = await uploadSiteImage(photoFile, "profile");
      const nameChanged = name.trim() && name.trim() !== agent.name;
      const whatsappChanged = whatsapp.trim() !== (agent.whatsapp ?? "");
      const res = await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nameChanged ? name.trim() : undefined,
          whatsapp: whatsappChanged ? whatsapp.trim() : undefined,
          photoUrl,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error === "empty_request" ? "Altera pelo menos um campo antes de enviar." : "Não foi possível enviar o pedido. Tenta novamente.");
        return;
      }
      setPending({
        name: nameChanged ? name.trim() : null,
        whatsapp: whatsappChanged ? whatsapp.trim() : null,
        photoUrl: photoUrl ?? null,
        createdAt: new Date().toISOString(),
      });
      setEditing(false);
      setPhotoFile(null);
    } catch (e) {
      setErr(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    try {
      await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <div className="mt-4 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--hx-border)", background: "var(--hx-surface-blue)" }}>
        <p className="flex items-center gap-2 font-medium">
          <Clock className="size-4" /> Pedido de alteração enviado — a aguardar aprovação.
        </p>
        <ul className="mt-2 space-y-1 hx-muted">
          {pending.name && <li>Nome proposto: <strong className="text-foreground">{pending.name}</strong></li>}
          {pending.whatsapp && <li>WhatsApp proposto: <strong className="text-foreground">{pending.whatsapp}</strong></li>}
          {pending.photoUrl && <li>Nova fotografia enviada — aguarda aprovação.</li>}
        </ul>
        <button
          onClick={cancelRequest}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />} Cancelar pedido
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]"
      >
        <Pencil className="size-4" /> Editar perfil
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--hx-border)" }}>
      <div className="flex items-center gap-4">
        <div className="relative">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <AgentAvatar agent={agent} className="size-16 text-lg" />
          )}
          <label className="absolute -bottom-1 -right-1 grid size-6 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Camera className="size-3.5" />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} />
          </label>
        </div>
        <p className="text-xs hx-muted">Nova fotografia — só fica visível depois de aprovada.</p>
      </div>

      <label className="mt-4 block text-sm">
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>
      <label className="mt-3 block text-sm">
        Telefone / WhatsApp
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>

      <p className="mt-3 text-xs hx-muted">As alterações ficam pendentes até serem aprovadas pela coordenação/administração.</p>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar para aprovação
        </button>
        <button
          onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); setName(agent.name); setWhatsapp(agent.whatsapp ?? ""); }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}
