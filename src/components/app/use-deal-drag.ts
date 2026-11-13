"use client";
import * as React from "react";
import { DEAL_STEPS, type DealStage } from "@/lib/data/deal";
interface Drag<S extends string> {
  id: string;
  stage: S;
  target: S | null;
  x: number;
  y: number;
  keyboard: boolean;
}
/** Pointer capture supports mouse, pen and touch without disabling board scrolling. */
export function useBoardDrag<S extends string>(
  onDrop: (id: string, stage: S) => void,
  disabled: boolean,
  stages: readonly { stage: S; label: string }[],
  attribute: "data-deal-stage" | "data-lead-stage",
) {
  const [drag, setDrag] = React.useState<Drag<S> | null>(null),
    ref = React.useRef<Drag<S> | null>(null),
    board = React.useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = React.useState("");
  function update(next: Drag<S> | null) {
    ref.current = next;
    setDrag(next);
  }
  const pointerDragging = drag !== null && !drag.keyboard;
  React.useEffect(() => {
    if (!pointerDragging) return;
    let frame: number;
    function scroll() {
      const el = board.current,
        d = ref.current;
      if (!el || !d) return;
      const r = el.getBoundingClientRect();
      if (d.y >= r.top && d.y <= r.bottom) {
        const edge = 56;
        if (d.x < r.left + edge) el.scrollLeft -= 14;
        else if (d.x > r.right - edge) el.scrollLeft += 14;
        const target = document
          .elementFromPoint(d.x, d.y)
          ?.closest<HTMLElement>(`[${attribute}]`)?.getAttribute(attribute) as S | null | undefined;
        if (target !== d.target) update({ ...d, target: target ?? null });
      }
      frame = requestAnimationFrame(scroll);
    }
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [pointerDragging, attribute]);
  const handle = (id: string, stage: S) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      update({
        id,
        stage,
        target: stage,
        x: e.clientX,
        y: e.clientY,
        keyboard: false,
      });
      setAnnouncement("Arraste para a fase de destino.");
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = ref.current;
      if (!d || d.id !== id || d.keyboard) return;
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>(`[${attribute}]`)?.getAttribute(attribute) as S | null | undefined;
      update({ ...d, x: e.clientX, y: e.clientY, target: target ?? null });
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = ref.current;
      if (!d || d.id !== id || d.keyboard) return;
      update(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
      if (d.target && d.target !== d.stage) {
        setAnnouncement("A guardar mudança de fase.");
        onDrop(d.id, d.target);
      } else setAnnouncement("Movimento cancelado.");
    },
    onPointerCancel: () => {
      update(null);
      setAnnouncement("Movimento cancelado.");
    },
    onLostPointerCapture: () => {
      if (ref.current && !ref.current.keyboard) update(null);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const d = ref.current;
      if (e.key === "Escape") {
        e.preventDefault();
        update(null);
        setAnnouncement("Movimento cancelado.");
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!d) {
          update({ id, stage, target: stage, x: 0, y: 0, keyboard: true });
          setAnnouncement(
            "Use as setas para escolher a fase; Enter para guardar; Escape para cancelar.",
          );
        } else if (d.id === id && d.keyboard) {
          update(null);
          if (d.target && d.target !== stage) onDrop(id, d.target);
        }
        return;
      }
      if (
        d?.id === id &&
        d.keyboard &&
        ["ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const idx = stages.findIndex((s) => s.stage === d.target),
          next =
            stages[
              Math.max(
                0,
                Math.min(
                  stages.length - 1,
                  idx + (e.key === "ArrowRight" ? 1 : -1),
                ),
              )
            ];
        update({ ...d, target: next.stage });
        setAnnouncement(next.label);
      }
    },
  });
  return { drag, board, handle, announcement };
}

const DEAL_DRAG_STEPS = [...DEAL_STEPS, { stage: "cancelado" as const, label: "Perdidos" }];
export function useDealDrag(onDrop: (id: string, stage: DealStage) => void, disabled: boolean) {
  return useBoardDrag(onDrop, disabled, DEAL_DRAG_STEPS, "data-deal-stage");
}
