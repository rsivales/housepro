import type { PropertyStatus } from "./types";

/** Etiquetas e estilos das etiquetas de estado do imóvel. */
export const STATUS_LABEL: Record<PropertyStatus, string> = {
  novo: "Novo",
  destaque: "Destaque",
  reduzido: "Preço reduzido",
  oportunidade: "Oportunidade",
  reservado: "Reservado",
  cpcv: "CPCV",
  vendido: "Vendido",
};

/** Classes Tailwind para o badge (fundo + texto). Vermelho reservado às
 *  etiquetas mais impactantes/urgentes (oportunidade, baixa de preço); as
 *  restantes usam cores distintas mas mais neutras, para não competirem
 *  visualmente com o que realmente merece destaque. */
export const STATUS_STYLE: Record<PropertyStatus, string> = {
  novo: "bg-emerald-600 text-white",
  destaque: "bg-indigo-600 text-white",
  reduzido: "bg-rose-600 text-white",
  oportunidade: "bg-destructive text-destructive-foreground",
  reservado: "bg-sky-600 text-white",
  cpcv: "bg-slate-600 text-white",
  vendido: "bg-foreground text-background",
};

/** Etiquetas AUTOMÁTICAS derivadas do estado comercial (aparecem no site sem
 *  serem escritas à mão). As restantes etiquetas são manuais. */
export function autoTagsFromStatus(status?: PropertyStatus | null): string[] {
  switch (status) {
    case "vendido": return ["Vendido"];
    case "cpcv": return ["CPCV"];
    case "reservado": return ["Reservado"];
    case "reduzido": return ["Baixa de preço"];
    default: return [];
  }
}
