/**
 * Utilitários para criar agências (gestão da rede/marca) — a fonte de
 * verdade é a tabela real `agencies` (ver src/lib/db/repo.ts e
 * migration_agencies_real.sql), não este ficheiro.
 */

import type { Agency } from "@/lib/data/types";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Próximo código de agência livre (2 dígitos), evitando colisões. */
export function nextAgencyCode(all: Agency[]): number {
  const used = new Set(all.map((a) => a.code ?? 0));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}
