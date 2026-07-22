import type { PropertyStatus } from "./types";

/** Etiquetas e estilos das etiquetas de estado do imóvel. */
export const STATUS_LABEL: Record<PropertyStatus, string> = {
  novo: "Novo",
  destaque: "Destaque",
  reduzido: "Preço reduzido",
  oportunidade: "Oportunidade",
  reservado: "Reservado",
  vendido: "Vendido",
};

/** Classes Tailwind para o badge (fundo + texto). */
export const STATUS_STYLE: Record<PropertyStatus, string> = {
  novo: "bg-primary text-primary-foreground",
  destaque: "bg-gold text-gold-foreground",
  reduzido: "bg-destructive text-destructive-foreground",
  oportunidade: "bg-gold text-gold-foreground",
  reservado: "bg-sky-600 text-white",
  vendido: "bg-foreground text-background",
};
