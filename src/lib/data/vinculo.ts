/**
 * Vínculo do consultor — empresa própria vs. recibos verdes. Determina a coluna
 * da escada de comissão (+10 pontos com empresa validada, porque não gera custo
 * de "entidade contratante" na Segurança Social). A empresa só conta depois de
 * a administração validar os documentos.
 */

export type VinculoStatus = "recibos_verdes" | "empresa_pendente" | "empresa_validada";

export const VINCULO_LABEL: Record<VinculoStatus, { label: string; badge: string }> = {
  recibos_verdes: { label: "Recibos verdes", badge: "bg-secondary text-foreground" },
  empresa_pendente: { label: "Empresa · a validar", badge: "bg-gold/15 text-foreground" },
  empresa_validada: { label: "Empresa validada", badge: "bg-primary/15 text-primary" },
};

/** Tem direito ao escalão "com empresa" (+10 pontos)? Só se validada. */
export function hasCompanyBenefit(status: VinculoStatus): boolean {
  return status === "empresa_validada";
}

/** Documentos exigidos para validar a empresa. */
export const COMPANY_DOCS = [
  "Certidão permanente da sociedade",
  "Cartão de empresa / NIF",
  "Declaração de início de atividade",
];

/** Estado demo por consultor. */
export const demoVinculos: Record<string, VinculoStatus> = {
  ana: "empresa_validada",
  rui: "recibos_verdes",
  carla: "empresa_pendente",
  miguel: "recibos_verdes",
  sofia: "empresa_validada",
};
