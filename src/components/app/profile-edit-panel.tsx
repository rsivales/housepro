"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Clock, Loader2, Pencil, Send, X, XCircle } from "lucide-react";

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
 * Edição do próprio perfil (nome, foto, WhatsApp).
 * - Super Admin (`instant`): grava de imediato — não há ninguém acima para
 *   aprovar, por isso pedir aprovação a si próprio seria um ciclo sem sentido.
 * - Todos os outros papéis: não grava direto, cria um pedido pendente até o
 *   Super Admin aprovar (ver /admin/aprovacoes). Enquanto houver um pedido
 *   pendente, mostra-o em vez do formulário e permite cancelá-lo.
 */
export function ProfileEditPanel({ agent, initialPending, instant = false }: { agent: Agent; initialPending: PendingProfileRequest | null; instant?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(agent.name);
  const [whatsapp, setWhatsapp] = React.useState(agent.whatsapp ?? "");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingProfileRequest | null>(initialPending);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submitInstant() {
    setBusy(true);
    setErr(null);
    try {
      let photoUrl: string | undefined;
      if (photoFile) photoUrl = await uploadSiteImage(photoFile, "profile");
      const nameChanged = name.trim() && name.trim() !== agent.name;
      const whatsappChanged = whatsapp.trim() !== (agent.whatsapp ?? "");
      if (!nameChanged && !whatsappChanged && !photoUrl) {
        setErr("Altera pelo menos um campo antes de guardar.");
        return;
      }
      const res = await fetch("/api/admin/consultores", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: agent.id,
          name: nameChanged ? name.trim() : undefined,
          whatsapp: whatsappChanged ? whatsapp.trim() : undefined,
          photoUrl,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(`Não foi possível guardar${j.error ? `: ${j.error}` : "."}`);
        return;
      }
      setEditing(false);
      setPhotoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      router.refresh();
    } catch (e) {
      setErr(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest() {
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
        if (j.error === "empty_request") setErr("Altera pelo menos um campo antes de enviar.");
        else if (j.error === "table_missing") setErr("Esta funcionalidade ainda não foi ativada na base de dados (falta aplicar a migração). Pede à administração para correr o SQL mais recente no Supabase.");
        else setErr(`Não foi possível enviar o pedido${j.error ? `: ${j.error}` : ""}.`);
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
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]"
        >
          <Pencil className="size-4" /> Editar perfil
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="size-4" /> Guardado.
          </span>
        )}
      </div>
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
        <p className="text-xs hx-muted">{instant ? "Nova fotografia — aplica-se assim que guardares." : "Nova fotografia — só fica visível depois de aprovada."}</p>
      </div>

      <label className="mt-4 block text-sm">
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>
      <label className="mt-3 block text-sm">
        Telefone / WhatsApp
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>

      <p className="mt-3 text-xs hx-muted">
        {instant ? "Como Super Admin, gravas de imediato — sem aprovação." : "As alterações ficam pendentes até serem aprovadas pelo Super Admin."}
      </p>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={instant ? submitInstant : submitRequest}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : instant ? <Check className="size-4" /> : <Send className="size-4" />}
          {instant ? "Guardar" : "Enviar para aprovação"}
        </button>
        <button
          onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); setName(agent.name); setWhatsapp(agent.whatsapp ?? ""); setErr(null); }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}
