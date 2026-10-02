"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { loadSiteContent, publishSection, type BrandAssets, type SignatureBrand } from "@/lib/data/site-content";

const defaults: BrandAssets = {
  header: "/brand/housepro-logo.webp", headerAlt: "HousePro",
  footer: "/brand/housepro-logo-full.webp", footerAlt: "HousePro — Paixão pelo que fazemos",
  mark: "/brand/housepro-logo.webp", markAlt: "HousePro",
};

const sigDefaults: SignatureBrand = { logo: "", logoAlt: "HousePro Signature" };

export default function BrandAssetsPage() {
  const [value, setValue] = React.useState(defaults);
  const [status, setStatus] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  const [sig, setSig] = React.useState(sigDefaults);
  const [sigStatus, setSigStatus] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  React.useEffect(() => {
    loadSiteContent(true).then((c) => {
      setValue({ ...defaults, ...c.brandassets });
      setSig({ ...sigDefaults, ...c.signaturebrand });
    });
  }, []);
  const patch = (next: Partial<BrandAssets>) => setValue((current) => ({ ...current, ...next }));
  async function save() { setStatus("saving"); const result = await publishSection("brandassets", value); setStatus(result.persisted ? "ok" : "error"); }
  const patchSig = (next: Partial<SignatureBrand>) => setSig((current) => ({ ...current, ...next }));
  async function saveSig() { setSigStatus("saving"); const result = await publishSection("signaturebrand", sig); setSigStatus(result.persisted ? "ok" : "error"); }
  return <div className="min-h-dvh bg-background"><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <Link href="/admin/website" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Website público</Link>
    <h1 className="mt-4 font-display text-3xl">Identidade e logótipos</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Use ficheiros com fundo transparente. O sistema otimiza e converte automaticamente para WebP. Formatos: JPG, PNG, WebP ou AVIF; máximo 25 MB antes da otimização.</p>
    <div className="mt-7 grid gap-4">
      <MediaUploadField area="brand" label="Logótipo horizontal — cabeçalhos" help="Recomendado: 1200 × 300 px, proporção 4:1, até 1 MB após otimização." value={value.header} alt={value.headerAlt} onUploaded={(header) => patch({ header })} onAltChange={(headerAlt) => patch({ headerAlt })} />
      <MediaUploadField area="brand" label="Logótipo completo — rodapés" help="Recomendado: 1200 × 420 px, incluindo assinatura/slogan, fundo transparente." value={value.footer} alt={value.footerAlt} onUploaded={(footer) => patch({ footer })} onAltChange={(footerAlt) => patch({ footerAlt })} />
      <MediaUploadField area="brand" label="Símbolo compacto" help="Recomendado: 512 × 512 px, formato quadrado, fundo transparente. Preparado para avatares e identificadores compactos." value={value.mark} alt={value.markAlt} onUploaded={(mark) => patch({ mark })} onAltChange={(markAlt) => patch({ markAlt })} />
    </div>
    <button onClick={save} disabled={status === "saving"} className="mt-6 min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{status === "saving" ? "A publicar…" : "Publicar logótipos"}</button>
    {status === "ok" ? <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Logótipos publicados globalmente.</p> : null}
    {status === "error" ? <p className="mt-3 text-sm text-destructive" role="alert">Não foi possível publicar. Confirme a sessão de Super Admin e tente novamente.</p> : null}

    <h2 className="mt-14 font-display text-2xl">HousePro Signature — logótipo exclusivo</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
      Logótipo próprio para o cabeçalho da coleção de imóveis de luxo (<Link href="/signature" target="_blank" className="underline underline-offset-2">/signature</Link>).
      Enquanto não for definido, mostra o wordmark &quot;HOUSEPRO / SIGNATURE&quot; por defeito.
    </p>
    <div className="mt-5">
      <MediaUploadField area="brand" label="Logótipo — coleção Signature" help="Recomendado: fundo transparente, tom claro (aparece sobre foto escura). Até 1 MB após otimização." value={sig.logo} alt={sig.logoAlt} onUploaded={(logo) => patchSig({ logo })} onAltChange={(logoAlt) => patchSig({ logoAlt })} />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button onClick={saveSig} disabled={sigStatus === "saving"} className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{sigStatus === "saving" ? "A publicar…" : "Publicar logótipo Signature"}</button>
      {sig.logo ? <button onClick={() => patchSig({ logo: "", logoAlt: sigDefaults.logoAlt })} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">Repor wordmark por defeito</button> : null}
    </div>
    {sigStatus === "ok" ? <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Logótipo Signature publicado.</p> : null}
    {sigStatus === "error" ? <p className="mt-3 text-sm text-destructive" role="alert">Não foi possível publicar. Confirme a sessão de Super Admin e tente novamente.</p> : null}
  </main></div>;
}
