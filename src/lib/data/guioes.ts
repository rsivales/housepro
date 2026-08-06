/**
 * Guiões (roteiros) de angariação e venda — o que dizer e fazer em cada fase de
 * uma reunião, com frases-chave e respostas a objeções. Servem de apoio ao vivo
 * (a par da "Reunião Uau") e de formação para novos consultores.
 */

export type GuiaoType = "angariacao" | "venda" | "investidor";

export interface GuiaoPhase {
  title: string;
  goal: string;
  points: string[];
  /** Frases-chave para usar tal e qual. */
  phrases?: string[];
}

export interface Objection {
  q: string;
  a: string;
}

export interface Guiao {
  type: GuiaoType;
  title: string;
  subtitle: string;
  duration: string;
  phases: GuiaoPhase[];
  objections: Objection[];
}

export const GUIOES: Guiao[] = [
  {
    type: "angariacao",
    title: "Guião de angariação",
    subtitle: "Conquistar o mandato — de preferência em exclusivo.",
    duration: "45–60 min",
    phases: [
      {
        title: "1. Preparação (antes da visita)",
        goal: "Chegar a saber mais do imóvel e da zona do que o próprio proprietário.",
        points: [
          "Estuda vendas comparáveis recentes na zona (preço/m²).",
          "Reúne a documentação que vais pedir (caderneta, certidão, energético).",
          "Leva o dossier HousePro e exemplos de marketing (fotos, vídeo, staging).",
        ],
      },
      {
        title: "2. Rapport e descoberta",
        goal: "Perceber a motivação e o prazo do proprietário.",
        points: [
          "Porque está a vender? Para onde vai a seguir?",
          "Qual é o prazo ideal? Há urgência?",
          "Já tentou vender antes? O que correu menos bem?",
        ],
        phrases: [
          "«Para o ajudar a vender bem, preciso de perceber o que é mesmo importante para si nesta mudança.»",
        ],
      },
      {
        title: "3. Apresentar o plano HousePro",
        goal: "Mostrar o método, não o preço. Vender a experiência.",
        points: [
          "Fotografia e vídeo profissionais + virtual staging (antes/depois).",
          "Exportação para Idealista, Imovirtual e redes — alcance máximo.",
          "Acompanhamento do primeiro contacto à escritura, com checklist.",
        ],
        phrases: [
          "«O meu trabalho não é pôr um anúncio — é criar procura e defender o seu valor até à escritura.»",
        ],
      },
      {
        title: "4. Preço e exclusividade",
        goal: "Ancorar no valor de mercado e fechar em exclusivo.",
        points: [
          "Apresenta os comparáveis: o mercado define o preço, não a opinião.",
          "Explica porque a exclusividade vende mais depressa e melhor.",
          "Define comissão com clareza e o que ela inclui.",
        ],
        phrases: [
          "«Com exclusividade, comprometo-me com um plano e presto contas. Sem ela, ninguém assume o resultado.»",
        ],
      },
      {
        title: "5. Fecho",
        goal: "Assinar o CMI e agendar a produção de conteúdos.",
        points: [
          "Recapitula o plano e os próximos passos.",
          "Assina o contrato de mediação e recolhe documentos.",
          "Agenda já a sessão de fotos/vídeo.",
        ],
        phrases: ["«Se estivermos alinhados, proponho começarmos já. Marcamos as fotos para quando?»"],
      },
    ],
    objections: [
      { q: "«A comissão é alta.»", a: "Foco no retorno: um bom processo costuma vender mais caro e mais depressa — a comissão paga-se no valor que defendo e no tempo que poupa." },
      { q: "«Quero experimentar sem exclusividade.»", a: "Sem exclusividade ninguém assume o resultado e o imóvel queima-se em anúncios repetidos. Com exclusividade tem um responsável e um plano." },
      { q: "«Outra agência prometeu preço mais alto.»", a: "Qualquer um promete um preço para ganhar o mandato. Eu mostro-lhe os comparáveis reais — prefiro dizer-lhe a verdade do que desiludi-lo daqui a três meses." },
    ],
  },
  {
    type: "venda",
    title: "Guião de venda (comprador)",
    subtitle: "Acompanhar o comprador da visita à proposta.",
    duration: "30–45 min",
    phases: [
      {
        title: "1. Qualificação",
        goal: "Perceber necessidade, orçamento e capacidade financeira.",
        points: [
          "O que procura e porquê? Prazo para mudar?",
          "Orçamento e situação de crédito (pré-aprovação?).",
          "Quem decide a compra?",
        ],
        phrases: ["«Para não lhe fazer perder tempo, vamos ver o que faz sentido para o seu momento e orçamento.»"],
      },
      {
        title: "2. Visita orientada",
        goal: "Fazer o comprador projetar-se a viver ali.",
        points: [
          "Destaca 2–3 pontos fortes alinhados com o que ele valoriza.",
          "Deixa-o explorar; faz perguntas em vez de discursar.",
          "Antecipa objeções (luz, ruído, obras) com honestidade.",
        ],
      },
      {
        title: "3. Recolha de feedback",
        goal: "Medir o interesse real e próximos passos.",
        points: [
          "«De 0 a 10, quanto é que este imóvel encaixa no que procura?»",
          "O que falta para ser um 10?",
          "Testar disponibilidade para proposta.",
        ],
      },
      {
        title: "4. Proposta",
        goal: "Converter interesse em proposta escrita.",
        points: [
          "Enquadra o preço com comparáveis e o estado do imóvel.",
          "Explica o processo (reserva, CPCV, escritura) e prazos.",
          "Acompanha a submissão e gere expectativas dos dois lados.",
        ],
        phrases: ["«Se este é o imóvel certo, o meu papel é ajudá-lo a apresentar uma proposta que tenha hipóteses reais.»"],
      },
    ],
    objections: [
      { q: "«Está acima do meu orçamento.»", a: "Vamos ver o custo real com crédito e despesas — às vezes a diferença mensal é pequena para o salto de qualidade. Ou encontro alternativas próximas." },
      { q: "«Quero pensar.»", a: "Faz sentido. O que em concreto o faz hesitar? Se for o preço, vejo margem; se for uma dúvida, esclareço já para não perder o imóvel." },
      { q: "«Vou esperar que baixe.»", a: "Pode acontecer, mas os bons imóveis nesta zona costumam sair depressa. Prefere arriscar perdê-lo ou apresentar uma proposta ajustada agora?" },
    ],
  },
  {
    type: "investidor",
    title: "Guião de investidor",
    subtitle: "Falar a linguagem do retorno.",
    duration: "30–45 min",
    phases: [
      {
        title: "1. Perfil de investimento",
        goal: "Perceber objetivo: rendimento, mais-valia ou ambos.",
        points: [
          "Horizonte temporal e apetite ao risco.",
          "Prefere arrendamento tradicional, curta duração ou revenda?",
          "Capital disponível e uso de crédito/alavancagem.",
        ],
      },
      {
        title: "2. Apresentar a oportunidade",
        goal: "Mostrar números, não emoção.",
        points: [
          "Yield bruta e líquida, ocupação estimada, custos.",
          "Potencial de valorização da zona (procura, oferta, obras públicas).",
          "Comparação com alternativas (depósitos, outros imóveis).",
        ],
        phrases: ["«Para um investidor, o imóvel é um ativo. Vamos olhar para os números como olharia para qualquer investimento.»"],
      },
      {
        title: "3. Cenários e sensibilidade",
        goal: "Dar confiança com cenários realistas.",
        points: [
          "Cenário conservador / base / otimista.",
          "Impacto de subida de taxas ou vacância.",
          "Estratégia de saída (revenda, refinanciamento).",
        ],
      },
      {
        title: "4. Fecho",
        goal: "Avançar para reserva com plano claro.",
        points: [
          "Recapitula retorno e riscos mitigados.",
          "Define próximos passos e prazos.",
          "Oferece acompanhamento na gestão pós-compra.",
        ],
      },
    ],
    objections: [
      { q: "«A yield é baixa.»", a: "A yield é só parte: soma a valorização esperada e o efeito da alavancagem. No total, o retorno costuma superar alternativas de risco semelhante." },
      { q: "«E se as taxas subirem?»", a: "Simulamos esse cenário: mesmo com subida, a operação aguenta-se com esta ocupação. E há margem para renegociar o crédito." },
      { q: "«Prefiro depósito a prazo.»", a: "É mais seguro no papel, mas rende pouco e não protege da inflação. O imóvel dá rendimento e um ativo que valoriza." },
    ],
  },
];

export function guiaoByType(type: string): Guiao | undefined {
  return GUIOES.find((g) => g.type === type);
}
