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
  arrendado: "Arrendado",
};

/** Geometria e acabamento comuns às etiquetas sobre fotografias.
 *  Só o fundo é translúcido: o texto mantém a sua legibilidade. */
export const PROPERTY_BADGE_STYLE =
  "rounded-[8px] border border-white/20 font-semibold shadow-sm backdrop-blur-sm";

export const SIGNATURE_BADGE_STYLE = "bg-[#D6B45C]/70 text-[#2B210D]";

/** Cores semânticas: novidade verde, destaque vermelho vivo, oportunidade carmim,
 *  redução de preço rosa, reserva azul vivo e estados finais mais sóbrios. */
export const STATUS_STYLE: Record<PropertyStatus, string> = {
  novo: "bg-emerald-700/70 text-white",
  destaque: "bg-[#E00018]/70 text-white",
  reduzido: "bg-rose-800/70 text-white",
  oportunidade: "bg-[#A31621]/70 text-white",
  reservado: "bg-[#2563EB]/70 text-white",
  cpcv: "bg-violet-800/70 text-white",
  vendido: "bg-slate-800/70 text-white",
  arrendado: "bg-teal-800/70 text-white",
};

/** Etiquetas AUTOMÁTICAS derivadas do estado comercial (aparecem no site sem
 *  serem escritas à mão). As restantes etiquetas são manuais. */
export function autoTagsFromStatus(status?: PropertyStatus | null): string[] {
  switch (status) {
    case "vendido": return ["Vendido"];
    case "arrendado": return ["Arrendado"];
    case "cpcv": return ["CPCV"];
    case "reservado": return ["Reservado"];
    case "reduzido": return ["Baixa de preço"];
    default: return [];
  }
}
