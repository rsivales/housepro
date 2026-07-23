import type { Agency, Agent, Property } from "./types";

/**
 * Temporary in-memory data used to build and approve the UI in Milestone 1.
 * Replaced by Supabase queries (RLS por agência) from Milestone 2 onwards.
 */

export const agencies: Agency[] = [
  { id: "lisboa", name: "HousePro Lisboa", slug: "lisboa", region: "Lisboa" },
  { id: "porto", name: "HousePro Porto", slug: "porto", region: "Porto" },
  { id: "cascais", name: "HousePro Cascais", slug: "cascais", region: "Cascais" },
  { id: "braga", name: "HousePro Braga", slug: "braga", region: "Braga" },
  { id: "algarve", name: "HousePro Algarve", slug: "algarve", region: "Algarve" },
];

export const agencyBySlug = (slug: string): Agency | undefined =>
  agencies.find((a) => a.slug === slug);

export const agencyById = (id: string): Agency | undefined =>
  agencies.find((a) => a.id === id);

export const agents: Agent[] = [
  {
    id: "ana",
    name: "Ana Marques",
    role: "Consultora sénior",
    roleKey: "agente",
    agency: "HousePro Lisboa",
    agencyId: "lisboa",
    whatsapp: "351910000001",
    accent: "var(--brand)",
    photo: "/agents/ana.jpg",
  },
  {
    id: "rui",
    name: "Rui Tavares",
    role: "Consultor",
    roleKey: "agente",
    agency: "HousePro Porto",
    agencyId: "porto",
    whatsapp: "351910000002",
    accent: "var(--gold)",
    photo: "/agents/rui.jpg",
  },
  {
    id: "sofia",
    name: "Sofia Nunes",
    role: "Coordenadora",
    roleKey: "coordenador",
    agency: "HousePro Cascais",
    agencyId: "cascais",
    whatsapp: "351910000003",
    accent: "oklch(0.55 0.09 230)",
    photo: "/agents/sofia.jpg",
  },
  {
    id: "miguel",
    name: "Miguel Costa",
    role: "Consultor (AMI próprio)",
    roleKey: "agente_ami",
    ownAMI: true,
    agency: "HousePro Braga",
    agencyId: "braga",
    whatsapp: "351910000004",
    accent: "oklch(0.62 0.12 40)",
    photo: "/agents/miguel.jpg",
  },
  {
    id: "carla",
    name: "Carla Sousa",
    role: "Diretora de agência",
    roleKey: "diretor",
    agency: "HousePro Algarve",
    agencyId: "algarve",
    whatsapp: "351910000005",
    accent: "oklch(0.6 0.11 250)",
    photo: "/agents/carla.jpg",
  },
];

export const agentById = (id: string): Agent =>
  agents.find((a) => a.id === id) ?? agents[0];

export const agentsByAgency = (agencyId: string): Agent[] =>
  agents.filter((a) => a.agencyId === agencyId);

export const properties: Property[] = [
  {
    id: "1",
    reference: "HP-1042",
    title: "Apartamento com terraço e vista rio",
    operation: "venda",
    type: "Apartamento",
    typology: "T3",
    price: 685000,
    area: 138,
    beds: 3,
    baths: 2,
    parish: "Alcântara",
    municipality: "Lisboa",
    energy: "A",
    status: "destaque",
    image: "/properties/terracotta-dusk.svg",
    agentId: "ana",
    // Co-angariação (parceria Ana + Rui): comissão repartida.
    coAgentIds: ["rui"],
    commissionType: "percent",
    commissionPct: 5,
    commissionSplit: [
      { agentId: "ana", pct: 60 },
      { agentId: "rui", pct: 40 },
    ],
    documents: ["cmi", "doc_proprietario", "caderneta", "certidao_predial", "cert_energetico", "licenca_utilizacao", "planta"],
    interest: 84,
    listedAt: "2026-07-12",
  },
  {
    id: "2",
    reference: "HP-1043",
    title: "Moradia contemporânea com jardim e piscina",
    operation: "venda",
    type: "Moradia",
    typology: "T4",
    price: 1250000,
    area: 320,
    beds: 4,
    baths: 4,
    parish: "Birre",
    municipality: "Cascais",
    energy: "A+",
    status: "novo",
    image: "/properties/sage-day.svg",
    agentId: "sofia",
    interest: 71,
    listedAt: "2026-07-18",
  },
  {
    id: "3",
    reference: "HP-1044",
    title: "Apartamento renovado no coração da Baixa",
    operation: "venda",
    type: "Apartamento",
    typology: "T2",
    price: 420000,
    area: 92,
    beds: 2,
    baths: 1,
    parish: "Cedofeita",
    municipality: "Porto",
    energy: "B",
    status: "reduzido",
    image: "/properties/dusty-blue.svg",
    agentId: "rui",
    interest: 90,
    commissionType: "percent",
    commissionPct: 4,
    documents: ["caderneta", "certidao_predial", "cert_energetico", "licenca_utilizacao", "planta", "ficha_tecnica", "identificacao"],
    listedAt: "2026-07-05",
  },
  {
    id: "4",
    reference: "HP-1045",
    title: "Moradia de traça clássica com quintal",
    operation: "venda",
    type: "Moradia",
    typology: "T3",
    price: 560000,
    area: 210,
    beds: 3,
    baths: 2,
    parish: "São Vítor",
    municipality: "Braga",
    energy: "C",
    status: "reservado",
    image: "/properties/warm-sand.svg",
    agentId: "miguel",
    interest: 52,
    commissionType: "fixed",
    commissionFixed: 12000,
    documents: ["caderneta", "cert_energetico", "planta"],
    listedAt: "2026-06-20",
  },
  {
    id: "5",
    reference: "HP-1046",
    title: "Penthouse com rooftop privado",
    operation: "venda",
    type: "Apartamento",
    typology: "T4",
    price: 1690000,
    area: 245,
    beds: 4,
    baths: 3,
    parish: "Avenidas Novas",
    municipality: "Lisboa",
    energy: "A",
    status: "destaque",
    image: "/properties/twilight.svg",
    agentId: "ana",
    interest: 80,
    commissionType: "percent",
    commissionPct: 4.5,
    documents: ["caderneta", "certidao_predial", "cert_energetico", "licenca_utilizacao"],
    sellerType: "empresa",
    listedAt: "2026-07-16",
  },
  {
    id: "6",
    reference: "HP-1047",
    title: "Apartamento para arrendar com varanda",
    operation: "arrendamento",
    type: "Apartamento",
    typology: "T1",
    price: 1350,
    area: 64,
    beds: 1,
    baths: 1,
    parish: "Bonfim",
    municipality: "Porto",
    energy: "B-",
    status: "novo",
    image: "/properties/olive.svg",
    agentId: "rui",
    interest: 88,
    listedAt: "2026-07-19",
  },
  {
    id: "7",
    reference: "HP-1048",
    title: "Moradia de luxo com vista mar e piscina",
    operation: "venda",
    type: "Moradia",
    typology: "T5",
    price: 2950000,
    area: 540,
    beds: 5,
    baths: 5,
    parish: "Olhos de Água",
    municipality: "Albufeira",
    energy: "A+",
    status: "oportunidade",
    image: "/properties/villa-aerial.jpg",
    gallery: ["/properties/villa-aerial.jpg"],
    shortDescription:
      "Moradia isolada de arquitetura contemporânea, a poucos minutos da praia de Olhos de Água, com piscina privativa, amplos terraços e vistas desafogadas sobre o mar.",
    description:
      "Implantada num lote generoso e virada a sul, esta moradia T5 distribui-se por três pisos servidos por elevador. O piso social abre-se para uma sala com pé-direito duplo e envidraçados de correr que ligam ao terraço e à piscina de água salgada. A cozinha, totalmente equipada com eletrodomésticos de gama alta, comunica com uma zona de refeições exterior coberta. Os cinco quartos são todos suites, com roupeiros embutidos e casas de banho revestidas a materiais nobres. Completam o imóvel garagem para três viaturas, painéis solares, domótica e sistema de videovigilância. Uma oportunidade rara na zona premium do Algarve.",
    areaUtil: 420,
    areaDependente: 120,
    landArea: 1250,
    garage: true,
    elevator: true,
    constructionYear: 2021,
    lat: 37.0894,
    lng: -8.1963,
    agentId: "carla",
    interest: 95,
    commissionType: "percent",
    commissionPct: 5,
    documents: ["caderneta", "certidao_predial", "cert_energetico", "planta"],
    listedAt: "2026-07-20",
  },
  {
    id: "8",
    reference: "HP-1049",
    title: "Moradia tradicional portuguesa com piscina",
    operation: "venda",
    type: "Moradia",
    typology: "T3",
    price: 595000,
    area: 180,
    beds: 3,
    baths: 2,
    parish: "São Brás de Alportel",
    municipality: "Faro",
    energy: "C",
    status: "novo",
    image: "/properties/casapt-aerial.jpg",
    gallery: ["/properties/casapt-aerial.jpg", "/properties/casapt-wc.jpg"],
    shortDescription:
      "Casa tipicamente algarvia recuperada com bom gosto, com quintal, piscina e a tranquilidade do interior serrano a 20 minutos das praias de Faro.",
    description:
      "Esta moradia térrea T3 preserva os traços da arquitetura tradicional algarvia — chaminé rendilhada, telha de canudo e platibandas — combinados com uma recuperação recente que trouxe conforto contemporâneo. Dispõe de sala com recuperador de calor, cozinha em plano aberto, três quartos amplos e dois quartos de banho. O logradouro, murado e ajardinado, integra uma piscina e uma zona de churrasco, ideal para viver o Algarve todo o ano. Com garagem e arrecadação, é a escolha certa para quem procura autenticidade sem abdicar de acessos fáceis.",
    areaUtil: 150,
    areaDependente: 30,
    landArea: 640,
    garage: true,
    elevator: false,
    constructionYear: 1998,
    lat: 37.153,
    lng: -7.888,
    agentId: "carla",
    interest: 76,
    commissionType: "percent",
    commissionPct: 5,
    documents: ["caderneta", "cert_energetico"],
    approval: "pendente",
    submittedAt: "2026-07-22T07:40:00",
    listedAt: "2026-07-17",
  },
  {
    id: "9",
    reference: "HP-1050",
    title: "Estúdio para investimento no centro histórico",
    operation: "venda",
    type: "Apartamento",
    typology: "T0",
    price: 82000,
    area: 38,
    beds: 0,
    baths: 1,
    parish: "Sé",
    municipality: "Guarda",
    energy: "D",
    status: "oportunidade",
    image: "/properties/olive.svg",
    agentId: "rui",
    interest: 60,
    // Exceção autorizada pela administração: comissão fixa abaixo do mínimo
    // do escalão (5.000 €), com justificação interna.
    commissionType: "fixed",
    commissionFixed: 3500,
    commissionJustification: "Cliente recorrente e angariação estratégica da carteira na Guarda.",
    commissionApprovedBy: "Carla Sousa (coordenação)",
    documents: ["caderneta"],
    approval: "pendente",
    submittedAt: "2026-07-21T07:40:00",
    listedAt: "2026-07-15",
  },
  {
    id: "v1",
    reference: "HP-0990",
    title: "Apartamento renovado junto ao rio",
    operation: "venda",
    type: "Apartamento",
    typology: "T2",
    price: 465000,
    area: 98,
    beds: 2,
    baths: 2,
    parish: "Belém",
    municipality: "Lisboa",
    energy: "B",
    status: "vendido",
    image: "/properties/sage-day.svg",
    agentId: "ana",
    listedAt: "2026-05-02",
    soldAt: "2026-07-10",
  },
  {
    id: "v2",
    reference: "HP-0991",
    title: "Moradia com jardim em zona calma",
    operation: "venda",
    type: "Moradia",
    typology: "T4",
    price: 720000,
    area: 260,
    beds: 4,
    baths: 3,
    parish: "Aldoar",
    municipality: "Porto",
    energy: "A",
    status: "vendido",
    image: "/properties/warm-sand.svg",
    agentId: "rui",
    listedAt: "2026-04-18",
    soldAt: "2026-06-28",
  },
  {
    id: "v3",
    reference: "HP-0992",
    title: "T3 com vista serra e garagem",
    operation: "venda",
    type: "Apartamento",
    typology: "T3",
    price: 389000,
    area: 120,
    beds: 3,
    baths: 2,
    parish: "Nogueira",
    municipality: "Braga",
    energy: "B-",
    status: "vendido",
    image: "/properties/olive.svg",
    agentId: "miguel",
    listedAt: "2026-03-30",
    soldAt: "2026-06-12",
  },
];

/** Publicável: não vendido e aprovado (oculto ao público até aprovação). */
export const isPublished = (p: Property): boolean =>
  p.status !== "vendido" && (p.approval == null || p.approval === "aprovado");

/** Available = publicáveis, usados nas montras públicas. */
export const availableProperties = properties.filter(isPublished);

export const soldProperties = properties.filter((p) => p.status === "vendido");

export const featuredProperties = availableProperties;

/** Imóveis do consultor — inclui pendentes de aprovação (visão interna). */
export const propertiesByAgent = (agentId: string): Property[] =>
  properties.filter((p) => p.agentId === agentId && p.status !== "vendido");

/** Montra pública da agência — apenas publicados. */
export const propertiesByAgency = (agencyId: string): Property[] =>
  availableProperties.filter((p) => agentById(p.agentId).agencyId === agencyId);

/** Imóveis a aguardar aprovação (fila da administração/coordenação). */
export const pendingApprovals = (): Property[] =>
  properties.filter((p) => p.approval === "pendente");

export const soldByAgency = (agencyId: string): Property[] =>
  soldProperties.filter((p) => agentById(p.agentId).agencyId === agencyId);

export const propertyById = (id: string): Property | undefined =>
  properties.find((p) => p.id === id);

/**
 * Imóveis semelhantes a `property`, ordenados por proximidade: mesmo concelho,
 * mesmo tipo e faixa de preço (±40%). Exclui o próprio e os vendidos.
 */
export const similarProperties = (
  property: Property,
  limit = 3
): Property[] => {
  const score = (p: Property) => {
    let s = 0;
    if (p.municipality === property.municipality) s += 3;
    if (p.type === property.type) s += 2;
    if (p.typology && p.typology === property.typology) s += 1;
    const ratio = property.price ? Math.abs(p.price - property.price) / property.price : 1;
    if (ratio <= 0.4) s += 2;
    else if (ratio <= 0.7) s += 1;
    return s;
  };
  return availableProperties
    .filter((p) => p.id !== property.id)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
};
