"use client";

import * as React from "react";
import { Loader2, Save, Image as ImageIcon, X } from "lucide-react";
import { OCCASION_LABEL, type OccasionKey } from "@/lib/data/holidays";
import { occasionCopy, premiumEmailHtml } from "@/lib/email/housepro-premium";

const AUDIENCE_LABEL: Record<string, string> = { clientes: "Clientes", consultores: "Consultores", brokers: "Brokers" };
const OCCASIONS: (OccasionKey | "aniversario")[] = ["natal", "pascoa", "carnaval", "abril_25", "halloween", "santos_populares", "dia_mae", "dia_pai", "aniversario"];
const AUDIENCES = ["clientes", "consultores", "brokers"] as const;

interface Row { occasion_key: string; audience: string; subject: string; body: string; image_url: string | null; enabled: boolean; updated_at: string | null }

export function InstitutionalMessagesManager() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    fetch("/api/admin/institutional-messages").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, []);

  function row(occasion: string, audience: string) {
    return rows?.find((r) => r.occasion_key === occasion && r.audience === audience);
  }

  async function save(occasion: string, audience: string, subject: string, body: string, imageUrl: string | null, enabled: boolean) {
    const key = `${occasion}:${audience}`;
    setBusy(key);
    setMessage("");
    try {
      const res = await fetch("/api/admin/institutional-messages", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasionKey: occasion, audience, subject, body, imageUrl, enabled }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setRows((prev) => prev?.map((r) => (r.occasion_key === occasion && r.audience === audience ? { ...r, subject, body, image_url: imageUrl, enabled } : r)) ?? null);
      setOpen(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setBusy(null);
    }
  }

  if (!rows) return <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A carregar…</p>;

  return (
    <div className="mt-6 space-y-3">
      {message && <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{message}</p>}
      {OCCASIONS.map((occasion) => (
        <div key={occasion} className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="font-medium">{occasion === "aniversario" ? "Aniversário" : OCCASION_LABEL[occasion as OccasionKey]}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {occasion === "aniversario" ? "Envio automático à data de nascimento de cada pessoa." : "Envio automático nesta data, todos os anos."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {AUDIENCES.map((audience) => {
              const r = row(occasion, audience);
              const key = `${occasion}:${audience}`;
              return (
                <div key={audience} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{AUDIENCE_LABEL[audience]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r?.enabled ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground"}`}>
                      {r?.enabled ? "Ativo" : "Desligado"}
                    </span>
                  </div>
                  {open === key ? (
                    <EditForm
                      initialSubject={r?.subject || occasionCopy(occasion, audience).subject}
                      initialBody={r?.body || occasionCopy(occasion, audience).body}
                      initialImageUrl={r?.image_url ?? null}
                      initialEnabled={r?.enabled ?? false}
                      busy={busy === key}
                      onCancel={() => setOpen(null)}
                      onSave={(subject, body, imageUrl, enabled) => save(occasion, audience, subject, body, imageUrl, enabled)}
                    />
                  ) : (
                    <button type="button" onClick={() => setOpen(key)} className="mt-2 text-xs font-medium text-primary hover:underline">
                      {r?.subject ? "Editar mensagem" : "Configurar mensagem"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditForm({ initialSubject, initialBody, initialImageUrl, initialEnabled, busy, onCancel, onSave }: {
  initialSubject: string; initialBody: string; initialImageUrl: string | null; initialEnabled: boolean; busy: boolean;
  onCancel: () => void; onSave: (subject: string, body: string, imageUrl: string | null, enabled: boolean) => void;
}) {
  const [subject, setSubject] = React.useState(initialSubject);
  const [body, setBody] = React.useState(initialBody);
  const [imageUrl, setImageUrl] = React.useState(initialImageUrl);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState("");
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [preview, setPreview] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    setImageError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/admin/institutional-messages/image", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setImageUrl(d.url);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto (pode usar {nome})" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensagem (pode usar {nome})" rows={4} className="w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none" />
      <div>
        <span className="text-xs font-medium text-muted-foreground">Imagem do email (postal)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) uploadImage(file);
          }}
        />
        {imageUrl ? (
          <div className="mt-1.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Imagem do email" className="h-16 w-28 rounded-md border object-cover" />
            <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="rounded-md border px-2 py-1 text-xs disabled:opacity-60">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : "Substituir"}
            </button>
            <button type="button" disabled={uploading} onClick={() => setImageUrl(null)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-destructive disabled:opacity-60">
              <X className="size-3.5" /> Retirar
            </button>
          </div>
        ) : (
          <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs disabled:opacity-60">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />} Carregar imagem
          </button>
        )}
        {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Ativar envio automático
      </label>
      <button type="button" onClick={() => setPreview((v) => !v)} className="text-xs font-semibold text-primary underline underline-offset-2">{preview ? "Fechar pré-visualização" : "Pré-visualizar email premium"}</button>
      {preview && <iframe title="Pré-visualização do email HousePro" sandbox="" srcDoc={premiumEmailHtml(subject, body, imageUrl)} className="h-[490px] w-full rounded-xl border bg-white" />}
      <div className="flex gap-2">
        <button type="button" disabled={busy || uploading} onClick={() => onSave(subject, body, imageUrl, enabled)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-xs">Cancelar</button>
      </div>
    </div>
  );
}
