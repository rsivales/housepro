"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Descrição do imóvel em blocos legíveis, com expansão "Ler descrição completa"
 * / "Mostrar menos". Preserva a formatação em parágrafos (quebras de linha).
 */
export function PropertyDescription({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  const paragraphs = text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const long = paragraphs.length > 2 || text.length > 320;
  const shown = open || !long ? paragraphs : paragraphs.slice(0, 2);

  return (
    <section id="descricao" aria-labelledby="descricao-heading" className="scroll-mt-24">
      <h2 id="descricao-heading" className="font-display text-2xl text-[var(--hp-navy)]">
        Descrição
      </h2>
      <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />

      <div className="mt-4 max-w-2xl space-y-4 leading-relaxed text-[var(--hp-text-2)]">
        {shown.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hp-red)] hover:underline"
        >
          {open ? (
            <>Mostrar menos <ChevronUp className="size-4" /></>
          ) : (
            <>Ler descrição completa <ChevronDown className="size-4" /></>
          )}
        </button>
      )}
    </section>
  );
}
