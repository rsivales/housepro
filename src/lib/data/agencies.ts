/**
 * Gestão de agências (marca) — camada de edição/criação por cima das agências
 * base. Guarda-se em site_settings (chave "agencies"): renomear/editar região
 * das existentes e criar novas. Assim o Super Admin/administração pode gerir a
 * rede sem tocar no código.
 */

import type { Agency } from "@/lib/data/types";

export interface AgencyOverride {
  name?: string;
  region?: string;
}

export interface CreatedAgency {
  id: string;
  name: string;
  slug: string;
  region: string;
  code: number;
}

export interface AgenciesConfig {
  overrides: Record<string, AgencyOverride>;
  created: CreatedAgency[];
  /** Agências suspensas (id) — ocultas ao público, mantidas no back office. */
  suspended?: string[];
  /** Agências base eliminadas (id) — ocultas em todo o lado. As criadas são
   *  removidas diretamente de `created`. */
  removed?: string[];
}

export const DEFAULT_AGENCIES_CONFIG: AgenciesConfig = { overrides: {}, created: [], suspended: [], removed: [] };

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Aplica edições e acrescenta as agências criadas às agências base.
 * Por defeito exclui as agências eliminadas e suspensas (vista pública);
 * passar `{ includeHidden: true }` para as manter (back office).
 */
export function mergeAgencies(
  base: Agency[],
  cfg: AgenciesConfig,
  opts: { includeHidden?: boolean } = {}
): Agency[] {
  const removed = new Set(cfg.removed ?? []);
  const suspended = new Set(cfg.suspended ?? []);
  const hidden = (id: string) => !opts.includeHidden && (removed.has(id) || suspended.has(id));

  const edited = base
    .filter((a) => opts.includeHidden || !removed.has(a.id))
    .map((a) => {
      const o = cfg.overrides?.[a.id];
      return o ? { ...a, name: o.name ?? a.name, region: o.region ?? a.region } : a;
    })
    .filter((a) => !hidden(a.id));
  const created: Agency[] = (cfg.created ?? [])
    .filter((c) => !hidden(c.id))
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, region: c.region, code: c.code }));
  return [...edited, ...created];
}

/** Próximo código de agência livre (2 dígitos), evitando colisões. */
export function nextAgencyCode(all: Agency[]): number {
  const used = new Set(all.map((a) => a.code ?? 0));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}
