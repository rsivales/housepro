/**
 * IMT + Imposto de Selo — motor de cálculo (2026).
 *
 * Funções puras, sem dependência de UI (regra do projeto: cálculos fora dos
 * componentes visuais). Escalões oficiais em vigor em 2026 (Ofício-Circulado
 * n.º 40129/2026 da Autoridade Tributária, OE 2026).
 *
 * O IMT é apurado escalão a escalão sobre a base tributável (o maior entre o
 * preço de escritura e o VPT). Nos dois escalões superiores aplica-se uma taxa
 * única sobre o valor total.
 */

export type Localizacao = "continente" | "ra";
export type Finalidade = "hpp" | "secundaria" | "terreno" | "rustico";
export type Prazo = "longo" | "curto";

/** Um escalão progressivo: limite superior + taxa marginal. */
type Escalao = [limite: number, taxa: number];

interface Tabela {
  prog: Escalao[];
  flat: Escalao[];
}

interface RegimeTabelas {
  hpp: Tabela;
  secundaria: Tabela;
  jovemTotal: number;
  jovemParcial: number;
}

export const TABELAS_2026: Record<Localizacao, RegimeTabelas> = {
  continente: {
    hpp: {
      prog: [
        [106346, 0],
        [145470, 0.02],
        [198347, 0.05],
        [330539, 0.07],
        [660982, 0.08],
      ],
      flat: [
        [1150853, 0.06],
        [Infinity, 0.075],
      ],
    },
    secundaria: {
      prog: [
        [106346, 0.01],
        [145470, 0.02],
        [198347, 0.05],
        [330539, 0.07],
        [633931, 0.08],
      ],
      flat: [
        [1150853, 0.06],
        [Infinity, 0.075],
      ],
    },
    jovemTotal: 330539,
    jovemParcial: 660982,
  },
  ra: {
    hpp: {
      prog: [
        [132933, 0],
        [181838, 0.02],
        [247934, 0.05],
        [413174, 0.07],
        [826228, 0.08],
      ],
      flat: [
        [1438566, 0.06],
        [Infinity, 0.075],
      ],
    },
    secundaria: {
      prog: [
        [132933, 0.01],
        [181838, 0.02],
        [247934, 0.05],
        [413174, 0.07],
        [792414, 0.08],
      ],
      flat: [
        [1438566, 0.06],
        [Infinity, 0.075],
      ],
    },
    jovemTotal: 413174,
    jovemParcial: 826228,
  },
};

/** Arquivo AT: Ofícios 40120/2023, 40123/2024 e 40128/2025. */
const TABELAS_HISTORICAS: Record<number, Record<Localizacao, RegimeTabelas>> = {
  2023: {
    continente: {
      hpp: { prog: [[97064,0],[132774,.02],[181034,.05],[301688,.07],[603289,.08]], flat: [[1050400,.06],[Infinity,.075]] },
      secundaria: { prog: [[97064,.01],[132774,.02],[181034,.05],[301688,.07],[578598,.08]], flat: [[1050400,.06],[Infinity,.075]] },
      jovemTotal: 0, jovemParcial: 0,
    },
    ra: {
      hpp: { prog: [[121330,0],[165968,.02],[226293,.05],[377110,.07],[754111,.08]], flat: [[1313000,.06],[Infinity,.075]] },
      secundaria: { prog: [[121330,.01],[165968,.02],[226293,.05],[377110,.07],[723248,.08]], flat: [[1313000,.06],[Infinity,.075]] },
      jovemTotal: 0, jovemParcial: 0,
    },
  },
  2024: {
    continente: {
      hpp: { prog: [[101917,0],[139412,.02],[190086,.05],[316772,.07],[633453,.08]], flat: [[1102920,.06],[Infinity,.075]] },
      secundaria: { prog: [[101917,.01],[139412,.02],[190086,.05],[316772,.07],[607528,.08]], flat: [[1102920,.06],[Infinity,.075]] },
      jovemTotal: 316772, jovemParcial: 633453,
    },
    ra: {
      hpp: { prog: [[127396,0],[174265,.02],[237608,.05],[395965,.07],[791816,.08]], flat: [[1378650,.06],[Infinity,.075]] },
      secundaria: { prog: [[127396,.01],[174265,.02],[237608,.05],[395965,.07],[759410,.08]], flat: [[1378650,.06],[Infinity,.075]] },
      jovemTotal: 395965, jovemParcial: 791816,
    },
  },
  2025: {
    continente: {
      hpp: { prog: [[104261,0],[142618,.02],[194458,.05],[324058,.07],[648022,.08]], flat: [[1128287,.06],[Infinity,.075]] },
      secundaria: { prog: [[104261,.01],[142618,.02],[194458,.05],[324058,.07],[621501,.08]], flat: [[1128287,.06],[Infinity,.075]] },
      jovemTotal: 324058, jovemParcial: 648022,
    },
    ra: {
      hpp: { prog: [[130326,0],[178273,.02],[243073,.05],[405073,.07],[810028,.08]], flat: [[1410359,.06],[Infinity,.075]] },
      secundaria: { prog: [[130326,.01],[178273,.02],[243073,.05],[405073,.07],[776876,.08]], flat: [[1410359,.06],[Infinity,.075]] },
      jovemTotal: 405073, jovemParcial: 810028,
    },
  },
};

export const IMT_ANOS_SUPORTADOS = [2023, 2024, 2025, 2026] as const;
export const IMT_FONTES: Record<number, string> = {
  2023: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40120_2023.pdf",
  2024: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_Circulado_40123_2024.pdf",
  2025: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40128_2025.pdf",
  2026: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40129_2026.pdf",
};

export function suportaImtHistorico(ano: number): boolean {
  return IMT_ANOS_SUPORTADOS.some((a) => a === ano);
}

/** Segmento de repartição do IMT por escalão (para o gráfico/legenda). */
export interface Segmento {
  de: number;
  ate: number;
  taxa: number;
  imp: number;
  /** true quando é uma taxa única aplicada ao valor total. */
  unica?: boolean;
}

export interface ImtInput {
  loc: Localizacao;
  fin: Finalidade;
  /** Valor de aquisição (escritura). */
  preco: number;
  /** Valor Patrimonial Tributário (opcional). */
  vpt?: number;
  /** IMT Jovem — comprador até 35 anos, 1.ª habitação (só HPP). */
  jovem?: boolean;
  /** Incluir Imposto de Selo do crédito à habitação. */
  credito?: boolean;
  /** Montante do empréstimo. */
  emprestimo?: number;
  /** Prazo do crédito. */
  prazo?: Prazo;
}

export interface ImtResultado {
  /** Base tributável usada (maior entre preço e VPT). */
  base: number;
  /** IMT devido. */
  imt: number;
  /** Imposto de Selo da aquisição (0,8%). */
  isAquisicao: number;
  /** Imposto de Selo do crédito (0,6% ou 0,5%). */
  isCredito: number;
  /** Soma dos impostos. */
  total: number;
  /** Repartição do IMT por escalão. */
  segmentos: Segmento[];
  /** Descrição do regime aplicado. */
  regime: string;
  /** true se isento de IMT (ex.: IMT Jovem total). */
  isento: boolean;
  /** true quando a base vem do VPT (por ser superior ao preço). */
  usouVpt: boolean;
}

/** IMT progressivo com repartição por escalão (ou taxa única nos topos). */
function imtProgressivo(valor: number, tab: Tabela): { total: number; segs: Segmento[] } {
  const { prog } = tab;
  const ultimo = prog[prog.length - 1][0];

  if (valor > ultimo) {
    for (const [lim, taxa] of tab.flat) {
      if (valor <= lim) {
        const t = valor * taxa;
        return { total: t, segs: [{ de: 0, ate: valor, taxa, imp: t, unica: true }] };
      }
    }
  }

  let total = 0;
  let prev = 0;
  const segs: Segmento[] = [];
  for (const [lim, taxa] of prog) {
    if (valor > lim) {
      const imp = (lim - prev) * taxa;
      total += imp;
      if (lim - prev > 0) segs.push({ de: prev, ate: lim, taxa, imp });
      prev = lim;
    } else {
      const impF = (valor - prev) * taxa;
      total += impF;
      segs.push({ de: prev, ate: valor, taxa, imp: impF });
      prev = valor;
      break;
    }
  }
  return { total, segs };
}

const eur0 = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Calcula IMT + Imposto de Selo a partir das entradas. */
export function calcularImt(input: ImtInput): ImtResultado {
  return calcularImtNoAno(input, 2026);
}

/** Nunca usa uma tabela atual para simular uma compra num ano não documentado. */
export function calcularImtNoAno(input: ImtInput, ano: number, data?: string): ImtResultado {
  if (!suportaImtHistorico(ano)) throw new RangeError("Não existe tabela histórica validada para este ano.");
  if (input.jovem && (ano < 2024 || (ano === 2024 && (!data || data < "2024-08-01")))) {
    throw new RangeError("A isenção jovem só se aplica a aquisições desde 1 de agosto de 2024.");
  }
  if (data && Number(data.slice(0, 4)) !== ano) throw new RangeError("A data não coincide com o ano da compra.");
  const preco = Math.max(0, input.preco || 0);
  const vpt = Math.max(0, input.vpt || 0);
  const base = Math.max(preco, vpt);

  const out: ImtResultado = {
    base,
    imt: 0,
    isAquisicao: 0,
    isCredito: 0,
    total: 0,
    segmentos: [],
    regime: "",
    isento: false,
    usouVpt: vpt > preco && vpt > 0,
  };

  if (base <= 0) return out;

  if (input.fin === "rustico") {
    out.imt = base * 0.05;
    out.regime = "Prédio rústico · 5%";
    out.segmentos = [{ de: 0, ate: base, taxa: 0.05, imp: out.imt, unica: true }];
    out.isAquisicao = base * 0.008;
  } else if (input.fin === "terreno") {
    out.imt = base * 0.065;
    out.regime = "Prédio urbano não habitacional · 6,5%";
    out.segmentos = [{ de: 0, ate: base, taxa: 0.065, imp: out.imt, unica: true }];
    out.isAquisicao = base * 0.008;
  } else {
    const regime = (TABELAS_HISTORICAS[ano] ?? TABELAS_2026)[input.loc];
    const tab = regime[input.fin];
    const jovemAtivo = input.fin === "hpp" && Boolean(input.jovem);

    if (jovemAtivo) {
      const lt = regime.jovemTotal;
      const lp = regime.jovemParcial;
      if (base <= lt) {
        out.imt = 0;
        out.isAquisicao = 0;
        out.isento = true;
        out.regime = "IMT Jovem · isenção total";
        out.segmentos = [];
      } else if (base <= lp) {
        const excesso = base - lt;
        out.imt = excesso * 0.08;
        out.isAquisicao = excesso * 0.008;
        out.regime = `IMT Jovem · isenção parcial (imposto só sobre ${eur0.format(excesso)} acima de ${eur0.format(lt)})`;
        out.segmentos = [{ de: lt, ate: base, taxa: 0.08, imp: out.imt }];
      } else {
        const r = imtProgressivo(base, tab);
        out.imt = r.total;
        out.segmentos = r.segs;
        out.regime = `Acima de ${eur0.format(lp)}: sem IMT Jovem, tabela normal`;
        out.isAquisicao = base * 0.008;
      }
    } else {
      const r = imtProgressivo(base, tab);
      out.imt = r.total;
      out.segmentos = r.segs;
      out.regime =
        (input.fin === "hpp" ? "Habitação própria e permanente" : "2.ª habitação / investimento") +
        " · " +
        (input.loc === "ra" ? "Açores e Madeira" : "Continente");
      out.isAquisicao = base * 0.008;
    }
  }

  if (input.credito && (input.emprestimo || 0) > 0) {
    out.isCredito = (input.emprestimo || 0) * (input.prazo === "curto" ? 0.005 : 0.006);
  }

  out.total = out.imt + out.isAquisicao + out.isCredito;
  return out;
}
