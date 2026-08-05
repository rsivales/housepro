"use client";

import * as React from "react";
import { Check, ImagePlus, MapPin, Save, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { concelhoKey, type ConcelhosConfig } from "@/lib/data/concelhos";

interface Candidate { name: string; district: string; count: number; autoImage: string }

/** Lê um ficheiro como data URL (fallback demo / pré-visualização instantânea). */
function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/**
 * Gestão da secção "Concelhos mais procurados": mostrar/ocultar, nº de
 * destaques e foto por concelho (upload → Storage, ou data URL em demo).
 */
export function ConcelhosAdmin({ candidates, initial }: { candidates: Candidate[]; initial: ConcelhosConfig }) {
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [count, setCount] = React.useState(initial.count ?? 3);
  const [photos, setPhotos] = React.useState<Record<string, string>>(initial.photos ?? {});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<null | "ok" | "demo" | "err">(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  async function upload(name: string, file: File) {
    const k = concelhoKey(name);
    setBusyKey(k);
    let url = "";
    try {
      const supabase = createClient();
      const path = `concelhos/${k}-${Date.now()}.jpg`;
      const up = await supabase.storage.from("property-media").upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (!up.error) url = supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
    } catch {/* cai para data URL */}
    if (!url) url = await readDataUrl(file);
    setPhotos((prev) => ({ ...prev, [k]: url }));
    setBusyKey(null);
  }

  function clearPhoto(name: string) {
    const k = concelhoKey(name);
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/brand/concelhos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { enabled, count, photos, agencies: initial.agencies ?? {} } }),
      });
      if (res.ok) setSaved("ok");
      else if (res.status === 401) setSaved("demo");
      else setSaved("err");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
    try { localStorage.setItem("concelhosConfig", JSON.stringify({ enabled, count, photos })); } catch {}
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Toggle + nº de destaques */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-primary" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Mostrar a secção na página principal
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          Destacar
          <select
            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm text-foreground"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          concelhos
        </label>
      </div>

      {/* Concelhos candidatos */}
      <div className={cn("space-y-2.5", !enabled && "opacity-50")}>
        {candidates.map((c, i) => {
          const k = concelhoKey(c.name);
          const img = photos[k] || c.autoImage;
          const highlighted = i < count;
          return (
            <div key={k} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground"><MapPin className="size-5" /></span>
                )}
                {highlighted && (
                  <span className="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.district || "Portugal"} · {c.count} imóvel(is)
                  {photos[k] ? " · foto própria" : c.autoImage ? " · capa automática" : " · sem foto"}
                  {highlighted ? "" : " · fora do destaque"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(c.name, f); }}
                  />
                  <span className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                    <ImagePlus className="size-3.5" /> {busyKey === k ? "…" : photos[k] ? "Trocar" : "Foto"}
                  </span>
                </label>
                {photos[k] && (
                  <button onClick={() => clearPhoto(c.name)} className="rounded-lg border px-2 py-1.5 text-muted-foreground hover:bg-secondary" title="Remover foto">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          <Save className="size-4" /> {saving ? "A guardar…" : "Guardar configuração"}
        </Button>
        {saved === "ok" && <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="size-4" /> Guardado.</span>}
        {saved === "demo" && <span className="text-sm text-muted-foreground">Guardado localmente (modo demo — sem Supabase).</span>}
        {saved === "err" && <span className="text-sm text-destructive">Falha ao guardar.</span>}
      </div>

      <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
        A foto carregada tem prioridade. Sem foto, usa-se a capa de um imóvel real do concelho
        (representativa e sem risco de links partidos). Evitamos imagens &ldquo;adivinhadas&rdquo; da
        internet porque partem-se com frequência.
      </p>
    </div>
  );
}
