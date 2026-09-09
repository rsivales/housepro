"use client";

import * as React from "react";
import { CheckCircle2, ImagePlus, XCircle } from "lucide-react";

import { UploadProgress, type UploadState } from "@/components/admin/upload-progress";
import { uploadErrorMessage, uploadSiteImage } from "@/lib/data/site-content";

export function MediaUploadField({ label, help, value, alt, area = "landing-pages", onUploaded, onAltChange }: {
  label: string;
  help: string;
  value?: string;
  alt?: string;
  area?: "banners" | "articles" | "stories" | "brand" | "landing-pages";
  onUploaded: (url: string) => void;
  onAltChange?: (alt: string) => void;
}) {
  const [state, setState] = React.useState<UploadState>();

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const url = await uploadSiteImage(file, area, (progress) => setState({ ...progress, tone: "progress" }));
      onUploaded(url);
      setState({ percent: 100, label: "Imagem carregada. Publique para aplicar no website.", tone: "success" });
    } catch (error) {
      setState({ percent: 100, label: uploadErrorMessage(error), tone: "error" });
    }
  }

  return <div className="rounded-2xl border bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-medium">{label}</p><p className="mt-1 max-w-xl text-xs text-muted-foreground">{help}</p></div>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-secondary">
        <ImagePlus className="size-4" /> {value ? "Substituir" : "Carregar"}
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={choose} disabled={state?.tone === "progress"} />
      </label>
    </div>
    {value ? <div className="mt-3 flex items-center gap-3"><img src={value} alt="Pré-visualização" className="h-20 w-32 rounded-lg object-cover" /><CheckCircle2 className="size-5 text-emerald-600" /></div> : null}
    {onAltChange ? <label className="mt-3 block text-sm">Texto alternativo (alt)<input value={alt ?? ""} onChange={(e) => onAltChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border bg-transparent px-3" /></label> : null}
    <UploadProgress state={state} />
    {state?.tone === "error" ? <XCircle className="mt-2 size-5 text-destructive" aria-hidden /> : null}
  </div>;
}
