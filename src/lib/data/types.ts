export type Operation = "venda" | "arrendamento";

export type PropertyType =
  | "Apartamento"
  | "Moradia"
  | "Terreno"
  | "Loja"
  | "Escritório";

export type PropertyStatus = "novo" | "destaque" | "reduzido" | "vendido";

export type EnergyRating =
  | "A+"
  | "A"
  | "B"
  | "B-"
  | "C"
  | "D"
  | "E"
  | "F";

export interface Agent {
  id: string;
  name: string;
  role: string;
  agency: string;
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
  agentId: string;
  /** Engagement proxy 0–100 (visitas + leads + favoritos) for ranking. */
  interest?: number;
  /** ISO date the listing went live, for recency ranking. */
  listedAt?: string;
}
