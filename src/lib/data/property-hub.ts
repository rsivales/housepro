import type { RotationConfig } from "@/lib/data/property-discovery";

export type PropertyHubConfig = {
  title?: string; intro?: string; sectionOrder?: string[]; rotation?: RotationConfig;
  municipalities?: string[]; municipalityPhotos?: Record<string, string>; municipalityAlt?: Record<string, string>;
  promo?: { active?: boolean; title?: string; text?: string; label?: string; href?: string; image?: string; alt?: string; startsAt?: string; endsAt?: string };
  alertTitle?: string; alertText?: string;
  versions?: PropertyHubVersion[];
};

export type PropertyHubVersion = {
  savedAt: string;
  savedBy?: string;
  snapshot: Omit<PropertyHubConfig, "versions">;
};

export function snapshotPropertyHub(value: PropertyHubConfig): Omit<PropertyHubConfig, "versions"> {
  const snapshot = { ...value };
  delete snapshot.versions;
  return snapshot;
}

export const DEFAULT_PROPERTY_HUB: Required<Pick<PropertyHubConfig, "title" | "intro" | "alertTitle" | "alertText">> & PropertyHubConfig = {
  title: "Encontre a casa certa.", intro: "Explore os imóveis disponíveis da HousePro.",
  alertTitle: "Não encontrou o imóvel certo?", alertText: "Guarde a sua pesquisa e receba novos imóveis antes de começar uma nova procura.",
  sectionOrder: ["hero", "municipalities", "promo", "alerts", "properties"], rotation: { startDate: "2026-01-01" },
  municipalities: [], municipalityPhotos: {}, municipalityAlt: {},
  promo: { active: true, title: "Vender para comprar?", text: "Comece por saber quanto vale a sua casa.", label: "Avaliar imóvel", href: "/avaliacao-imovel", image: "/home/conhecer-housepro.jpg", alt: "Avaliação profissional HousePro" },
};

export function mergePropertyHub(value?: PropertyHubConfig): PropertyHubConfig {
  return { ...DEFAULT_PROPERTY_HUB, ...(value ?? {}), rotation: { ...DEFAULT_PROPERTY_HUB.rotation, ...(value?.rotation ?? {}) }, promo: { ...DEFAULT_PROPERTY_HUB.promo, ...(value?.promo ?? {}) } };
}
