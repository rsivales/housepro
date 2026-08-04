/**
 * ────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA DE VERDADE das percentagens de comissão da HousePro.
 * ────────────────────────────────────────────────────────────────────────────
 * Todos os motores (escada em `tiers.ts`, override em `split.ts`/`override-chain`)
 * e todos os ecrãs LEEM daqui — muda-se num único sítio e "bate tudo certo",
 * sem margem para discrepâncias.
 *
 * Modelo (por perna de comissão — angariação e/ou venda, tratadas em separado):
 *  1. Royalties da marca: `royaltiesPct` de CADA lado (agente e agência).
 *  2. Fundo de pensão: `pensionPct` do lado do agente — retirado à cabeça.
 *  3. Escada de produtividade (`ladder`): a % do agente sobe com a faturação
 *     acumulada no ciclo; com empresa validada, +10 pontos vs. recibos verdes.
 *  4. Cap da agência (`agencyCap`): a agência não recebe mais do que isto por
 *     agente/ciclo; ao atingir, o excedente vai para o agente.
 *  5. Rede (`overrideTiers`): até à soma dos escalões (5+3+1+1 = 10%), financiada
 *     pela fatia da AGÊNCIA, distribuída pelos padrinhos do produtor por nível.
 */
export const COMMISSION = {
  /** Royalties da marca (%), aplicados de cada lado (agente e agência). */
  royaltiesPct: 3,
  /** Fundo de pensão do agente (%), retirado à cabeça. */
  pensionPct: 2,
  /** Override de rede por nível (padrinho direto → cima). Soma = pool de rede. */
  overrideTiers: [5, 3, 1, 1] as number[],
  /** Escada de produtividade (faturação acumulada → % do agente). */
  ladder: [
    { upTo: 10000, withCompany: 50, withoutCompany: 40 },
    { upTo: 60000, withCompany: 60, withoutCompany: 50 },
    { upTo: Infinity, withCompany: 90, withoutCompany: 80 },
  ],
  /** Teto do que a agência recebe de um agente por ciclo (€). */
  agencyCap: 30000,
} as const;

/** Pool de rede (%) = soma dos escalões de override. Derivado, nunca duplicado. */
export const NETWORK_POOL_PCT = COMMISSION.overrideTiers.reduce((a, b) => a + b, 0);

/** Profundidade máxima do override (nº de escalões configurados). */
export const OVERRIDE_DEPTH = COMMISSION.overrideTiers.length;
