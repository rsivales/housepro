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

/** Geometria e acabamento comuns às etiquetas sobre fotografias.
 *  Só o fundo é translúcido: o texto mantém a sua legibilidade. */
export const PROPERTY_BADGE_STYLE =
  "rounded-[8px] border border-white/20 font-semibold shadow-sm backdrop-blur-sm";

/** Cores semânticas: novidade verde, destaque azul, oportunidade carmim,
 *  redução de preço rosa, reserva âmbar e estados finais mais sóbrios. */
export const STATUS_STYLE: Record<PropertyStatus, string> = {
  novo: "bg-emerald-700/85 text-white",
  destaque: "bg-blue-800/85 text-white",
  reduzido: "bg-rose-800/85 text-white",
  oportunidade: "bg-[#A31621]/85 text-white",
  reservado: "bg-amber-800/85 text-white",
  cpcv: "bg-violet-800/85 text-white",
  vendido: "bg-slate-800/85 text-white",
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
