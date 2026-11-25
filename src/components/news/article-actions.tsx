"use client";

import { useState } from "react";
import { Copy, Mail, Printer, Share2 } from "lucide-react";

export function ArticleActions({ title, id }: { title: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://housepro.pt/noticias/${encodeURIComponent(id)}`;
  const encoded = encodeURIComponent(url);
  const label = encodeURIComponent(title);
  return <nav aria-label="Partilhar notícia" className="article-actions mt-8 flex flex-wrap items-center gap-2 border-y py-4 text-sm">
    <span className="mr-2 font-semibold text-[var(--hp-navy)]">Partilhar</span>
    <a className="rounded-full border px-3 py-2 hover:bg-secondary" href={`https://wa.me/?text=${label}%20${encoded}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    <a className="rounded-full border px-3 py-2 hover:bg-secondary" href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer">Facebook</a>
    <a className="rounded-full border px-3 py-2 hover:bg-secondary" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
    <a className="inline-flex items-center gap-1 rounded-full border px-3 py-2 hover:bg-secondary" href={`mailto:?subject=${label}&body=${encodeURIComponent(`Encontrei esta notícia no Guia HousePro: ${url}`)}`}><Mail className="size-4" /> Enviar por email</a>
    <button type="button" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 hover:bg-secondary" onClick={async () => {
      if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { /* cancelado pelo utilizador */ } }
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* navegador sem permissão */ }
    }}><Share2 className="size-4" /> {copied ? "Link copiado" : "Mais opções"}</button>
    <button type="button" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 hover:bg-secondary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* sem permissão */ } }}><Copy className="size-4" /> Copiar</button>
    <button type="button" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 hover:bg-secondary" onClick={() => window.print()}><Printer className="size-4" /> Imprimir / PDF</button>
  </nav>;
}
