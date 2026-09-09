export const PUBLIC_MEDIA = [
  { key: "home.recruitment", label: "Homepage — recrutamento", route: "/", fallback: "/home/equipa.webp", alt: "Equipa HousePro" },
  { key: "valuation.hero", label: "Avaliação — hero", route: "/avaliacao-imovel", fallback: "/home/banner-familia.webp", alt: "Consultora HousePro com proprietários" },
  { key: "valuation.adviser", label: "Avaliação — acompanhamento", route: "/avaliacao-imovel", fallback: "/home/equipa.webp", alt: "Equipa HousePro a analisar um imóvel" },
  { key: "selling.hero", label: "Vender — hero", route: "/vender", fallback: "/home/banner-familia.webp", alt: "Família e consultora HousePro numa moradia" },
  { key: "selling.team", label: "Vender — compromisso", route: "/vender", fallback: "/home/equipa.webp", alt: "Equipa HousePro" },
  { key: "credit.hero", label: "Crédito — hero e chamada final", route: "/credito", fallback: "/credito/hero.jpg", alt: "Especialista de crédito a acompanhar clientes" },
  { key: "credit.secondHome", label: "Crédito — segunda habitação", route: "/credito", fallback: "/credito/segunda-habitacao.jpg", alt: "Segunda habitação junto ao mar" },
  { key: "credit.company", label: "Crédito — empresa e investimento", route: "/credito", fallback: "/credito/empresa.jpg", alt: "Imóvel para empresa e investimento" },
  { key: "credit.resident", label: "Crédito — novo residente", route: "/credito", fallback: "/credito/chegar-portugal.jpg", alt: "Chegada de novos residentes a Portugal" },
  { key: "credit.guide", label: "Crédito — guia", route: "/credito", fallback: "/credito/guia-credito.jpg", alt: "Guia do crédito habitação HousePro" },
  { key: "capitalGains.hero", label: "Mais-valias — hero", route: "/ferramentas/calculadora-mais-valias", fallback: "/clinica/mais-valias-hero.jpg", alt: "Consultor a apresentar uma estimativa de mais-valias" },
  { key: "capitalGains.documents", label: "Mais-valias — documentos", route: "/ferramentas/calculadora-mais-valias", fallback: "/clinica/mais-valias-documentos.jpg", alt: "Documentos e calculadora usados numa simulação" },
  { key: "signature.hero", label: "Signature — hero e pesquisa privada", route: "/signature", fallback: "/signature/editorial-coast-hero.webp", alt: "Arquitetura contemporânea junto ao Atlântico" },
  { key: "signature.construction", label: "Signature — construção por medida", route: "/signature", fallback: "/signature/editorial-construction.webp", alt: "Arquitetura e construção por medida" },
] as const;

export type PublicMediaKey = (typeof PUBLIC_MEDIA)[number]["key"];
