"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Trophy, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { FATURACAO_PRIZES, ANGARIACAO_PRIZES, type Prize } from "@/lib/data/prizes";
import { readPrizeArt, savePrizeArt, type PrizeArtMap } from "@/lib/data/prize-art";

async function toArt(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read"));
    fr.readAsDataURL(file);
  });
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const MAX = 480;
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > MAX) {
    const s = MAX / Math.max(w, h);
    w = Math.round(w * s); h = Math.round(h * s);
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.86);
}

export default function AdminPremiosPage() {
  const [art, setArt] = React.useState<PrizeArtMap>({});
  const [saving, setSaving] = React.useState<"idle" | "saving" | "ok" | "err">("idle");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    setArt(readPrizeArt());
    // A versão global (Supabase) tem prioridade.
    if (isSupabaseConfigured()) {
      fetch("/api/brand/prize-art")
        .then((r) => r.json())
        .then((d) => {
          if (d?.art && Object.keys(d.art).length) {
            setArt(d.art);
            savePrizeArt(d.art);
          }
        })
        .catch(() => {});
    }
  }, []);

  function update(next: PrizeArtMap) {
    setArt(next);
    savePrizeArt(next);
  }

  async function onFile(prize: Prize, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(prize.name);
    try {
      const dataUrl = await toArt(f);
      let value = dataUrl;
      // Com Supabase: envia para o Storage e guarda o URL (global/cross-device).
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const blob = await (await fetch(dataUrl)).blob();
          const path = `brand/prizes/${prize.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`;
          const up = await supabase.storage.from("property-media").upload(path, blob, { contentType: "image/jpeg", upsert: true });
          if (!up.error) value = supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
        } catch { /* cai para o data URL local */ }
      }
      update({ ...art, [prize.name]: value });
    } catch { /* ignora */ } finally {
      setBusy(null);
    }
  }

  function remove(prize: Prize) {
    const next = { ...art };
    delete next[prize.name];
    update(next);
  }

  async function saveGlobal() {
    setSaving("saving");
    try {
      const res = await fetch("/api/brand/prize-art", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ art }),
      });
      setSaving(res.ok ? "ok" : "err");
    } catch {
      setSaving("err");
    }
    setTimeout(() => setSaving("idle"), 3000);
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Administração
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Trophy className="size-7 text-gold" /> Artes dos prémios
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Carrega a arte dedicada (troféu/render) de cada distinção. Aparece na área
          do consultor, no hall da fama e na montra pública. Sem arte, mostra-se uma
          medalha dourada.
        </p>

        {[["Faturação", FATURACAO_PRIZES], ["Angariação", ANGARIACAO_PRIZES]].map(([label, list]) => (
          <section key={label as string} className="mt-8">
            <h2 className="font-display text-xl">{label as string}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(list as Prize[]).map((p) => {
                const src = art[p.name];
                return (
                  <div key={p.name} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm">
                    <span className={cn("grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border", !src && "bg-secondary")}>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={p.name} className="size-full object-cover" />
                      ) : (
                        <Trophy className="size-6 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.tagline}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-secondary">
                        <ImagePlus className="size-3.5" /> {busy === p.name ? "A enviar…" : src ? "Trocar" : "Carregar"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(p, e)} disabled={busy === p.name} />
                      </label>
                      {src && (
                        <button type="button" onClick={() => remove(p)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                          <Trash2 className="size-3.5" /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-5">
          {isSupabaseConfigured() ? (
            <>
              <Button onClick={saveGlobal} disabled={saving === "saving"}>
                {saving === "saving" ? "A guardar…" : "Guardar para todo o site"}
              </Button>
              {saving === "ok" && <span className="text-sm text-emerald-600">✓ Artes publicadas para todos.</span>}
              {saving === "err" && <span className="text-sm text-destructive">Não foi possível guardar (só a administração).</span>}
              <span className="text-xs text-muted-foreground">Fica igual em todos os consultores e dispositivos.</span>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Protótipo guardado neste navegador. Liga o Supabase para publicar as artes a todos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
