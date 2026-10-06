"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Clock, Loader2, Pencil, Send, X, XCircle } from "lucide-react";

import { AgentAvatar } from "@/components/brand/agent-avatar";
import { uploadErrorMessage, uploadProfileImage } from "@/lib/data/site-content";
import { publicRoleLabel } from "@/lib/data/roles";
import type { Agent } from "@/lib/data/types";

export interface PendingProfileRequest {
  name: string | null;
  photoUrl: string | null;
  bannerUrl?: string | null;
  bannerChanged?: boolean;
  whatsapp: string | null;
  publicTitle: string | null;
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
  const [email, setEmail] = React.useState(agent.email ?? "");
  const [whatsapp, setWhatsapp] = React.useState(agent.whatsapp ?? "");
  const [publicTitle, setPublicTitle] = React.useState(agent.publicTitle ?? "");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [bannerFile, setBannerFile] = React.useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = React.useState(false);
  const [pending, setPending] = React.useState<PendingProfileRequest | null>(initialPending);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  React.useEffect(() => () => { if (bannerPreview) URL.revokeObjectURL(bannerPreview); }, [bannerPreview]);

  React.useEffect(() => { setPending(initialPending); }, [initialPending]);

  function pickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  }

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
      if (photoFile) photoUrl = await uploadProfileImage(photoFile);
      const bannerUrl = bannerFile ? await uploadProfileImage(bannerFile) : removeBanner ? "" : undefined;
      const nameChanged = name.trim() && name.trim() !== agent.name;
      const emailChanged = email.trim() !== (agent.email ?? "");
      const whatsappChanged = whatsapp.trim() !== (agent.whatsapp ?? "");
      const publicTitleChanged = publicTitle.trim() !== (agent.publicTitle ?? "");
      if (!nameChanged && !emailChanged && !whatsappChanged && !publicTitleChanged && !photoUrl && bannerUrl === undefined) {
        setErr("Altera pelo menos um campo antes de guardar.");
        return;
      }
      const res = await fetch("/api/admin/consultores", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: agent.id,
          name: nameChanged ? name.trim() : undefined,
          email: emailChanged ? email.trim() : undefined,
          whatsapp: whatsappChanged ? whatsapp.trim() : undefined,
          publicTitle: publicTitleChanged ? publicTitle.trim() : undefined,
          photoUrl,
          bannerUrl,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(`Não foi possível guardar${j.error ? `: ${j.error}` : "."}`);
        return;
      }
      setEditing(false);
      setPhotoFile(null);
      setBannerFile(null);
      setBannerPreview(null);
      setRemoveBanner(false);
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
      if (photoFile) photoUrl = await uploadProfileImage(photoFile);
      const bannerUrl = bannerFile ? await uploadProfileImage(bannerFile) : removeBanner ? "" : undefined;
      const nameChanged = name.trim() && name.trim() !== agent.name;
      const whatsappChanged = whatsapp.trim() !== (agent.whatsapp ?? "");
      const publicTitleChanged = publicTitle.trim() !== (agent.publicTitle ?? "");
      const res = await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nameChanged ? name.trim() : undefined,
          whatsapp: whatsappChanged ? whatsapp.trim() : undefined,
          publicTitle: publicTitleChanged ? publicTitle.trim() : undefined,
          photoUrl,
          bannerUrl,
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
        publicTitle: publicTitleChanged ? publicTitle.trim() : null,
        photoUrl: photoUrl ?? null,
        bannerUrl: bannerUrl ?? null,
        bannerChanged: bannerUrl !== undefined,
        createdAt: new Date().toISOString(),
      });
      setEditing(false);
      setPhotoFile(null);
      setBannerFile(null);
      setBannerPreview(null);
      setRemoveBanner(false);
    } catch (e) {
      setErr(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    try {
      setErr(null);
      const response = await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (!response.ok) { setErr("Não foi possível cancelar o pedido. Tenta novamente."); return; }
      setPending(null);
    } catch { setErr("Falha de ligação ao cancelar o pedido."); } finally {
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
          {pending.publicTitle && <li>Alias público proposto: <strong className="text-foreground">{pending.publicTitle}</strong></li>}
          {pending.photoUrl && <li>Nova fotografia enviada — aguarda aprovação.</li>}
          {pending.bannerChanged && <li>{pending.bannerUrl ? "Novo banner enviado" : "Remoção do banner pedida"} — aguarda aprovação.</li>}
        </ul>
        {err && <p role="alert" className="mt-2 text-destructive">{err}</p>}
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
            <span className="sr-only">Alterar fotografia</span><Camera className="size-3.5" />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} />
          </label>
        </div>
        <div className="text-xs hx-muted"><p>{instant ? "Nova fotografia — aplica-se assim que guardares." : "Nova fotografia — só fica visível depois de aprovada."}</p><p className="mt-1">Para uma fotografia integrada no cenário, use PNG ou WebP com fundo transparente. Também pode enviar uma fotografia normal.</p></div>
      </div>

      <div className="mt-5 border-t border-[var(--hx-border)] pt-4">
        <p className="text-sm font-medium">Banner da página pública</p>
        <p className="mt-1 text-sm hx-muted">Imagem horizontal, idealmente 1920 × 800 px. O texto e a fotografia do perfil são apresentados sobre o banner.</p>
        {!removeBanner && (bannerPreview || agent.banner) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerPreview || agent.banner} alt="Pré-visualização do banner" className="mt-3 aspect-[12/5] w-full rounded-xl object-cover" />
        )}
        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium">
          <Camera className="size-4" /> Escolher banner
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickBanner} />
        </label>
        {(agent.banner || bannerFile) && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={removeBanner} onChange={e => { setRemoveBanner(e.target.checked); if (e.target.checked) { setBannerFile(null); setBannerPreview(null); } }} />Remover banner e usar o fundo HousePro</label>}
      </div>

      <label className="mt-4 block text-sm">
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>
      {instant && (
        <label className="mt-3 block text-sm">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
        </label>
      )}
      <label className="mt-3 block text-sm">
        Telefone / WhatsApp
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
      </label>
      <label className="mt-3 block text-sm">
        Alias público (cargo mostrado no site)
        <input
          value={publicTitle}
          onChange={(e) => setPublicTitle(e.target.value)}
          placeholder="ex.: Consultor imobiliário"
          className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <span className="mt-1 block text-xs hx-muted">
          Aparece nas fichas de imóvel e na tua montra pública, em vez do teu papel interno
          ({publicRoleLabel({ ...agent, publicTitle: undefined })}). Deixa em branco para usar o rótulo automático.
        </span>
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
          onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); setBannerFile(null); setBannerPreview(null); setRemoveBanner(false); setName(agent.name); setEmail(agent.email ?? ""); setWhatsapp(agent.whatsapp ?? ""); setPublicTitle(agent.publicTitle ?? ""); setErr(null); }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}
