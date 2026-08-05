/**
 * Projetos internacionais — imóveis/empreendimentos no estrangeiro que a
 * HousePro está autorizada a divulgar através de PARCERIAS (ex.: Dubai). Secção
 * própria: montra dedicada, sem se misturar com o mercado nacional, e com nota
 * fiscal/legal por país.
 */

export interface InternationalProject {
  id: string;
  title: string;
  country: string;
  /** Emoji da bandeira (evita imagens externas). */
  flag: string;
  city: string;
  /** Parceiro que autoriza a divulgação. */
  partner: string;
  /** Preço a partir de (na moeda local). */
  priceFrom: number;
  currency: string;
  /** Tipologias disponíveis. */
  typologies: string;
  /** Ano de entrega (obra nova). */
  deliveryYear?: number;
  summary: string;
  description: string;
  highlights: string[];
  /** Nota fiscal/legal relevante para o investidor português. */
  taxNote?: string;
  /** Gradiente do cartão (sem depender de imagens externas). */
  tint: string;
}

export const internationalProjects: InternationalProject[] = [
  {
    id: "dubai-marina-heights",
    title: "Marina Heights Residences",
    country: "Emirados Árabes Unidos",
    flag: "🇦🇪",
    city: "Dubai Marina",
    partner: "Parceria HousePro × developer local (autorizada)",
    priceFrom: 320000,
    currency: "EUR",
    typologies: "Studio a T3",
    deliveryYear: 2027,
    summary: "Torre à beira-mar em Dubai Marina, com planos de pagamento faseados e potencial de rendimento em aluguer.",
    description:
      "Empreendimento de nova construção em Dubai Marina, uma das zonas mais valorizadas e procuradas por investidores internacionais. Acabamentos premium, vistas de mar, e um plano de pagamento faseado durante a construção. Ideal para investimento com forte procura de arrendamento de curta duração.",
    highlights: [
      "Plano de pagamento 60/40 durante a obra",
      "Sem imposto sobre rendimento predial local",
      "Gestão de arrendamento chave-na-mão disponível",
      "Yields brutas historicamente 6–8% na zona",
    ],
    taxNote:
      "Investidores residentes em Portugal devem declarar rendimentos e mais-valias em Portugal; existe convenção para evitar dupla tributação com os EAU. Aconselhamento fiscal individual recomendado.",
    tint: "from-amber-500/25 via-primary/15 to-transparent",
  },
  {
    id: "dubai-downtown-skyline",
    title: "Downtown Skyline",
    country: "Emirados Árabes Unidos",
    flag: "🇦🇪",
    city: "Downtown Dubai",
    partner: "Parceria HousePro × developer local (autorizada)",
    priceFrom: 480000,
    currency: "EUR",
    typologies: "T1 a T4",
    deliveryYear: 2026,
    summary: "Frações premium junto ao Burj Khalifa, com serviços de hotel e forte liquidez de revenda.",
    description:
      "Residências de gama alta no coração de Downtown Dubai, a poucos minutos do Burj Khalifa e do Dubai Mall. Serviços tipo hotel, concierge e acesso a spa. Localização de prestígio com procura constante e boa liquidez de revenda.",
    highlights: [
      "Serviços de hotel 5 estrelas",
      "Localização de prestígio (Downtown)",
      "Programa de residência por investimento (Golden Visa EAU)",
    ],
    taxNote:
      "A aquisição pode dar acesso a vistos de residência nos EAU consoante o valor. Verifique implicações fiscais em Portugal antes de investir.",
    tint: "from-sky-500/25 via-primary/15 to-transparent",
  },
];

export function internationalById(id: string): InternationalProject | undefined {
  return internationalProjects.find((p) => p.id === id);
}
