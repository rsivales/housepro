"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { PUBLIC_MEDIA } from "@/lib/data/public-media";
import { loadSiteContent, publishSection, type MediaAssetMap } from "@/lib/data/site-content";

export default function PublicMediaPage() {
  const [assets, setAssets] = React.useState<MediaAssetMap>({});
  const [status, setStatus] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  React.useEffect(() => { loadSiteContent(true).then((c) => setAssets(c.mediaassets ?? {})); }, []);
  function patch(key: string, next: { url?: string; alt?: string }) { setAssets((current) => ({ ...current, [key]: { ...current[key], ...next } })); }
  async function save() { setStatus("saving"); const result = await publishSection("mediaassets", assets); setStatus(result.persisted ? "ok" : "error"); }
  return <div className="min-h-dvh bg-background"><SiteHeader /><main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <Link href="/admin/website" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Website público</Link>
    <h1 className="mt-4 font-display text-3xl">Fotografias das páginas públicas</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Biblioteca central dos heróis, banners e motivos promocionais das landing pages. Recomendado: 2400 × 1350 px para heróis, 1600 × 1000 px para cartões; JPG/WebP, até 25 MB. O corte adapta-se a desktop, tablet e mobile.</p>
    <div className="mt-7 grid gap-4 md:grid-cols-2">{PUBLIC_MEDIA.map((item) => { const value = assets[item.key]; return <div key={item.key}>
      <MediaUploadField label={item.label} help={`Usada em ${item.route}. Imagem de origem recomendada com pelo menos 1600 px de largura.`} value={value?.url || item.fallback} alt={value?.alt || item.alt} onUploaded={(url) => patch(item.key, { url })} onAltChange={(alt) => patch(item.key, { alt })} />
      <Link href={item.route} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Abrir página <ExternalLink className="size-3" /></Link>
    </div>; })}</div>
    <button onClick={save} disabled={status === "saving"} className="mt-7 min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{status === "saving" ? "A publicar…" : "Publicar fotografias"}</button>
    {status === "ok" ? <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Fotografias publicadas.</p> : null}
    {status === "error" ? <p className="mt-3 text-sm text-destructive" role="alert">Não foi possível publicar as alterações.</p> : null}
  </main></div>;
}
