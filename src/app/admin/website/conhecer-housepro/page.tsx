"use client";
import * as React from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { loadSiteContent, publishSection } from "@/lib/data/site-content";

const initial = { title: "Tratamos de tudo, do primeiro contacto à escritura.", label: "Conhecer a HousePro", href: "/historias-reais", image: "/home/conhecer-housepro.jpg", alt: "Consultora HousePro em reunião com clientes" };
export default function PromoAdmin() {
  const [value, setValue] = React.useState(initial);
  const [status, setStatus] = React.useState("");
  React.useEffect(() => { loadSiteContent(true).then((content) => setValue((current) => ({ ...current, ...(content.homepromo || {}) }))); }, []);
  async function save() { setStatus("A publicar…"); const result = await publishSection("homepromo", value); setStatus(result.persisted ? "Publicado com sucesso." : `Não foi possível guardar${result.error ? `: ${result.error}` : "."}`); }
  return <div className="min-h-dvh bg-background"><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-12"><Link href="/admin/website" className="text-sm text-primary">← Website</Link><h1 className="mt-4 font-display text-3xl">Banner “Conhecer a HousePro”</h1><p className="mt-2 text-sm text-muted-foreground">Aparece na homepage dentro da secção azul das ferramentas.</p><div className="mt-7 grid gap-4 rounded-2xl border bg-card p-5">
    <Field label="Texto principal" value={value.title} set={(title) => setValue({ ...value, title })} />
    <Field label="Texto do link" value={value.label} set={(label) => setValue({ ...value, label })} />
    <Field label="Destino do link" value={value.href} set={(href) => setValue({ ...value, href })} />
    <MediaUploadField area="banners" label="Imagem" help="Recomendado: 1800 × 700 px, JPG/WebP, máximo 25 MB. Garanta espaço visual para o texto do lado esquerdo." value={value.image} alt={value.alt} onUploaded={(image) => setValue((current) => ({ ...current, image }))} onAltChange={(alt) => setValue((current) => ({ ...current, alt }))} />
    <button onClick={save} className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-white">Publicar alterações</button>{status ? <p className={`text-sm ${status.startsWith("Não") ? "text-destructive" : "text-emerald-700"}`} role="status">{status}</p> : null}
  </div></main></div>;
}
function Field({ label, value, set }: { label: string; value: string; set: (value: string) => void }) { return <label className="text-sm">{label}<input value={value} onChange={(event) => set(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" /></label>; }
