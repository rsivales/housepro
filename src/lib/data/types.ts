export type Operation = "venda" | "arrendamento";

export type PropertyType =
  | "Apartamento"
  | "Moradia"
  | "Terreno"
  | "Loja"
  | "Escritório";

export type PropertyStatus =
  | "novo"
  | "destaque"
  | "reduzido"
  | "oportunidade"
  | "reservado"
  | "vendido";

export type EnergyRating =
  | "A+"
  | "A"
  | "B"
  | "B-"
  | "C"
  | "D"
  | "E"
  | "F";

export interface Agency {
  id: string;
  name: string;
  /** Public montra slug, e.g. "algarve". */
  slug: string;
  region: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  agency: string;
  /** Link to the Agency this consultant belongs to. */
  agencyId: string;
  /** Full international phone for wa.me click-to-chat, digits only. */
  whatsapp: string;
  /** Accent color token for the initials-avatar fallback. */
  accent: string;
  /** Headshot under /public/agents; falls back to initials when absent. */
  photo?: string;
}

export interface Property {
  id: string;
  /** Public listing reference, e.g. "HP-1024". */
  reference: string;
  title: string;
  operation: Operation;
  type: PropertyType;
  /** Typology: T0–T5, or null for land. */
  typology: string | null;
  price: number;
  /** Gross private area in m². */
  area: number;
  beds: number;
  baths: number;
  parish: string;
  municipality: string;
  energy: EnergyRating;
  status: PropertyStatus | null;
  /** Cover image path under /public/properties. */
  image: string;
  /** Optional gallery (real photos); cover first. */
  gallery?: string[];
  /** One-line teaser shown on the listing page. */
  shortDescription?: string;
  /** Full marketing description (paragraphs). */
  description?: string;
  /** Área útil (privativa) em m². */
  areaUtil?: number;
  /** Área dependente (varandas, arrecadação…) em m². */
  areaDependente?: number;
  /** Área de terreno / lote em m² (moradias, terrenos). */
  landArea?: number;
  /** Tem garagem / lugar de estacionamento. */
  garage?: boolean;
  /** Tem elevador. */
  elevator?: boolean;
  /** Ano de construção. */
  constructionYear?: number;
  /** Coordenadas para marcador preciso no mapa; opcional. */
  lat?: number;
  lng?: number;
  /** Comissão do imóvel em % do preço de venda. Visível a todos os
   *  consultores (interno), nunca ao público. */
  commissionPct?: number;
  agentId: string;
  /** Engagement proxy 0–100 (visitas + leads + favoritos) for ranking. */
  interest?: number;
  /** ISO date the listing went live, for recency ranking. */
  listedAt?: string;
  /** ISO date sold — present only when status is "vendido". */
  soldAt?: string;
}
