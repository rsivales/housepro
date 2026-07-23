/** Dados de exemplo dos portais do cliente (comprador, vendedor, investidor). */

export interface CompradorPortal {
  name: string;
  consultantId: string;
  /** ids de imóveis guardados */
  saved: string[];
  /** negócio ativo (deal.ts) */
  dealId: string;
  budget: number;
  /** propostas em curso */
  proposals: { propertyId: string; amount: number; status: "enviada" | "aceite" | "recusada" }[];
}

export interface VendedorPortal {
  name: string;
  consultantId: string;
  propertyId: string;
  valuation: { min: number; max: number; listed: number };
  stats: { views: number; leads: number; visits: number };
  dealId: string;
  /** documentos em falta são calculados a partir de Property.documents */
}

export interface Holding {
  propertyId: string;
  invested: number;
  monthlyRent: number;
  grossYield: number; // %
  netYield: number; // %
  roe: number; // %
  occupancy: number; // %
  valuationNow: number;
}

export interface InvestidorPortal {
  name: string;
  consultantId: string;
  holdings: Holding[];
  /** oportunidades sugeridas (ids) */
  opportunities: string[];
}

export const compradorPortal: CompradorPortal = {
  name: "João Pereira",
  consultantId: "ana",
  saved: ["1", "5", "7"],
  dealId: "d1",
  budget: 450000,
  proposals: [
    { propertyId: "3", amount: 415000, status: "aceite" },
    { propertyId: "1", amount: 660000, status: "enviada" },
  ],
};

export const vendedorPortal: VendedorPortal = {
  name: "Maria Sousa",
  consultantId: "rui",
  propertyId: "3",
  valuation: { min: 405000, max: 445000, listed: 420000 },
  stats: { views: 1284, leads: 24, visits: 7 },
  dealId: "d1",
};

export const investidorPortal: InvestidorPortal = {
  name: "Grupo Oliveira",
  consultantId: "carla",
  holdings: [
    {
      propertyId: "6",
      invested: 208000,
      monthlyRent: 1350,
      grossYield: 7.8,
      netYield: 5.9,
      roe: 9.4,
      occupancy: 100,
      valuationNow: 232000,
    },
    {
      propertyId: "8",
      invested: 560000,
      monthlyRent: 2600,
      grossYield: 5.6,
      netYield: 4.3,
      roe: 7.1,
      occupancy: 92,
      valuationNow: 615000,
    },
  ],
  opportunities: ["7", "2"],
};

export type ClientProfile = "comprador" | "vendedor" | "investidor";

export const CLIENT_PROFILES: { id: ClientProfile; label: string; href: string }[] = [
  { id: "comprador", label: "Comprador", href: "/cliente/comprador" },
  { id: "vendedor", label: "Vendedor", href: "/cliente/vendedor" },
  { id: "investidor", label: "Investidor", href: "/cliente/investidor" },
];
