"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ImagePlus, Eye, EyeOff } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { DEFAULT_BANNERS, type Banner } from "@/lib/data/banners";
import { readBanners, writeBanners, fileToDataUrl, newId } from "@/lib/data/site-content";

const field = "mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function BannersAdminPage() {
  const [banners, setBanners] = React.useState<Banner[]>(DEFAULT_BANNERS);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setBanners(readBanners()), []);

  function persist(next: Banner[]) {
    setBanners(next);
    writeBanners(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  function patch(id: string, p: Partial<Banner>) {
    persist(banners.map((b) => (b.id === id ? { ...b, ...p } : b)));
  }
  function add() {
    persist([
      ...banners,
      { id: newId("banner"), title: "Novo destaque", text: "", primary: { label: "Encontrar casa", href: "/imoveis" }, active: true, priority: 10 },
    ]);
  }
  function remove(id: string) {
    persist(banners.filter((b) => b.id !== id));
  }
  async function onImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    patch(id, { image: await fileToDataUrl(f) });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/admin/website" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Website público
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl">Banners do hero</h1>
          <button onClick={add} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Novo banner
          </button>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O banner de maior prioridade ativo é o principal. A rotação é lenta e pausável no site.
          {saved && <span className="ml-2 font-medium text-emerald-600">✓ Guardado</span>}
        </p>

        <div className="mt-6 space-y-5">
          {banners.map((b) => (
            <div key={b.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => patch(b.id, { active: b.active === false })}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                    title={b.active === false ? "Inativo" : "Ativo"}
                  >
                    {b.active === false ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5 text-emerald-600" />}
                    {b.active === false ? "Inativo" : "Ativo"}
                  </button>
                  <span className="text-xs text-muted-foreground">id: {b.id}</span>
                </div>
                <button onClick={() => remove(b.id)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                  <Trash2 className="size-4" /> Remover
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Imagem */}
                <div className="sm:col-span-2">
                  <span className="text-sm font-medium">Fotografia</span>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                      <ImagePlus className="size-4" /> {b.image ? "Trocar" : "Carregar"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(b.id, e)} />
                    </label>
                    {b.image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image} alt="" className="h-14 w-24 rounded-md object-cover" />
                        <button onClick={() => patch(b.id, { image: undefined })} className="text-xs text-muted-foreground hover:underline">Remover foto</button>
                      </>
                    )}
                    {!b.image && <span className="text-xs text-amber-600">Sem foto → fundo Deep Navy (fallback).</span>}
                  </div>
                </div>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium">Título</span>
                  <input className={field} value={b.title} onChange={(e) => patch(b.id, { title: e.target.value })} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium">Texto</span>
                  <input className={field} value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium">Linha (localizações/nota)</span>
                  <input className={field} value={b.line ?? ""} onChange={(e) => patch(b.id, { line: e.target.value })} placeholder="Algarve · Lisboa · Porto" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Botão principal — texto</span>
                  <input className={field} value={b.primary.label} onChange={(e) => patch(b.id, { primary: { ...b.primary, label: e.target.value } })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Botão principal — link</span>
                  <input className={field} value={b.primary.href} onChange={(e) => patch(b.id, { primary: { ...b.primary, href: e.target.value } })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Botão secundário — texto</span>
                  <input className={field} value={b.secondary?.label ?? ""} onChange={(e) => patch(b.id, { secondary: e.target.value ? { label: e.target.value, href: b.secondary?.href ?? "/vender" } : undefined })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Botão secundário — link</span>
                  <input className={field} value={b.secondary?.href ?? ""} onChange={(e) => patch(b.id, { secondary: b.secondary ? { ...b.secondary, href: e.target.value } : undefined })} />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Texto alternativo (alt)</span>
                  <input className={field} value={b.alt ?? ""} onChange={(e) => patch(b.id, { alt: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Prioridade</span>
                  <input type="number" className={field} value={b.priority ?? 0} onChange={(e) => patch(b.id, { priority: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Início (opcional)</span>
                  <input type="date" className={field} value={b.startAt?.slice(0, 10) ?? ""} onChange={(e) => patch(b.id, { startAt: e.target.value || undefined })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Fim (opcional)</span>
                  <input type="date" className={field} value={b.endAt?.slice(0, 10) ?? ""} onChange={(e) => patch(b.id, { endAt: e.target.value || undefined })} />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => persist(DEFAULT_BANNERS)} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">
            Repor banners por defeito
          </button>
        </div>
      </main>
    </div>
  );
}
