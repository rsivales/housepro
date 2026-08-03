"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Trophy, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
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
  React.useEffect(() => setArt(readPrizeArt()), []);

  function update(next: PrizeArtMap) {
    setArt(next);
    savePrizeArt(next);
  }
  async function onFile(prize: Prize, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      update({ ...art, [prize.name]: await toArt(f) });
    } catch { /* ignora */ }
  }
  function remove(prize: Prize) {
    const next = { ...art };
    delete next[prize.name];
    update(next);
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
                        <ImagePlus className="size-3.5" /> {src ? "Trocar" : "Carregar"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(p, e)} />
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

        <p className="mt-8 rounded-xl border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Protótipo guardado neste navegador. A persistência global (todos os
          consultores/dispositivos) liga ao Supabase, tal como a marca de água.
        </p>
      </div>
    </div>
  );
}
