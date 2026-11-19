/**
 * ────────────────────────────────────────────────────────────────────────────
 * Regime de referência da HousePro, usado antes de uma agência configurar o seu.
 * ────────────────────────────────────────────────────────────────────────────
 * Os fechos reais leem o regime versionado da agência e guardam-no no snapshot;
 * estes valores são o padrão e o fallback para estimativas sem configuração.
 *
 * Modelo (por perna de comissão — angariação e/ou venda, tratadas em separado):
 *  1. Royalties da marca: `royaltiesPct` de CADA lado (agente e agência).
 *  2. Fundo de pensão: `pensionPct` do lado do agente — retirado à cabeça.
 *  3. Escada de produtividade (`ladder`): a % do agente sobe com a faturação
 *     acumulada no ciclo; com empresa validada, +10 pontos vs. recibos verdes.
 *  4. Cap da agência: mantido só para ler planos históricos. Desativado no regime atual.
 *  5. Rede (`overrideTiers`): até à soma dos escalões (5+3+1+1 = 10%), financiada
 *     pela fatia da AGÊNCIA, distribuída pelos padrinhos do produtor por nível.
 */
export const COMMISSION = {
  /** Royalties da marca (%), aplicados de cada lado (agente e agência). */
  royaltiesPct: 3,
  /** Fundo de pensão do agente (%), retirado à cabeça. */
  pensionPct: 2,
  /** Contribuição do broker sobre a parcela bruta da agência (%). */
  brokerPensionPct: 2,
  /** Override de rede por nível (padrinho direto → cima). Soma = pool de rede. */
  overrideTiers: [5, 3, 1, 1] as number[],
  /** Escada de produtividade (faturação acumulada → % do agente). */
  ladder: [
    { upTo: 10000, withCompany: 50, withoutCompany: 40 },
    { upTo: 60000, withCompany: 60, withoutCompany: 50 },
    { upTo: Infinity, withCompany: 80, withoutCompany: 70 },
  ],
  /** Teto do que a agência recebe de um agente por ciclo (€). */
  agencyCap: 30000,
  agencyCapEnabled: false,
} as const;

/** Pool de rede (%) = soma dos escalões de override. Derivado, nunca duplicado. */
export const NETWORK_POOL_PCT = COMMISSION.overrideTiers.reduce((a, b) => a + b, 0);

/** Profundidade máxima do override (nº de escalões configurados). */
export const OVERRIDE_DEPTH = COMMISSION.overrideTiers.length;
