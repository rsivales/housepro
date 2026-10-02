"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, GripVertical, Loader2, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DIVISIONS } from "@/lib/imovel/model";

export interface Photo {
  id: string;
  kind: "remote" | "new";
  /** URL pronto a usar: URL remoto (já publicado) ou data URL (já com marca de
   *  água) para as fotos novas. */
  url: string;
  /** Data URL original (sem marca de água) — só nas fotos novas, para
   *  reprocessar quando o estilo da marca muda. */
  raw?: string;
  /** Divisão/etiqueta da fotografia (Sala, Cozinha, Quarto…). */
  division?: string;
}

/**
 * Gestor de fotografias: reordenar (arrastar — funciona no telemóvel), definir
 * a capa (a 1.ª é sempre a capa), etiquetar a divisão de cada foto e remover.
 * É presentational — o processamento (marca de água/upload) fica no pai.
 */
export function PhotoManager({
  value,
  onChange,
  processing,
}: {
  value: Photo[];
  onChange: (next: Photo[]) => void;
  processing?: boolean;
}) {
  const dragId = React.useRef<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= value.length) return;
    const next = [...value];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  }
  function remove(id: string) {
    onChange(value.filter((p) => p.id !== id));
  }
  function setDivision(id: string, division: string) {
    onChange(value.map((p) => (p.id === id ? { ...p, division } : p)));
  }
  function makeCover(id: string) {
    const from = value.findIndex((p) => p.id === id);
    move(from, 0);
  }

  // Arrastar (Pointer Events — rato e toque). O manípulo captura o ponteiro e,
  // a cada movimento, troca com a foto que estiver sob o dedo.
  function onHandleDown(e: React.PointerEvent, id: string) {
    dragId.current = id;
    setDraggingId(id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent) {
    if (!dragId.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pid]");
    const overId = el?.getAttribute("data-pid");
    if (overId && overId !== dragId.current) {
      move(
        value.findIndex((p) => p.id === dragId.current),
        value.findIndex((p) => p.id === overId)
      );
    }
  }
  function onHandleUp() {
    dragId.current = null;
    setDraggingId(null);
  }

  if (value.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {value.length} fotografia{value.length === 1 ? "" : "s"} · arraste para ordenar · a 1.ª é a capa
        </p>
        {processing && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((p, i) => (
          <div
            key={p.id}
            data-pid={p.id}
            className={cn(
              "group relative overflow-hidden rounded-lg border bg-card transition",
              draggingId === p.id && "opacity-60 ring-2 ring-primary"
            )}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.division || `Fotografia ${i + 1}`} className="aspect-[4/3] w-full object-cover" />

              {/* Capa */}
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Star className="size-3" /> Capa
                </span>
              )}

              {/* Manípulo de arrasto */}
              <button
                type="button"
                aria-label="Arrastar para ordenar"
                onPointerDown={(e) => onHandleDown(e, p.id)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                className="absolute right-1.5 top-1.5 grid size-8 cursor-grab touch-none place-items-center rounded-full bg-background/80 text-foreground active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </button>

              {/* Remover */}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remover fotografia"
                className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Controlo: setas + capa + divisão */}
            <div className="space-y-1.5 p-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Mover para trás"
                  className="grid size-7 place-items-center rounded-md border text-muted-foreground disabled:opacity-30 enabled:hover:bg-secondary"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  aria-label="Mover para a frente"
                  className="grid size-7 place-items-center rounded-md border text-muted-foreground disabled:opacity-30 enabled:hover:bg-secondary"
                >
                  <ArrowRight className="size-3.5" />
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(p.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
                  >
                    <Star className="size-3" /> Capa
                  </button>
                )}
              </div>
              <select
                value={p.division ?? ""}
                onChange={(e) => setDivision(p.id, e.target.value)}
                aria-label="Divisão da fotografia"
                className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring"
              >
                <option value="">Divisão…</option>
                {DIVISIONS.map((dv) => (
                  <option key={dv} value={dv}>{dv}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
