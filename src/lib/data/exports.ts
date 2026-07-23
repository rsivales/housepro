import type { Property } from "./types";
import { docStatus } from "@/lib/imovel/model";

/** Integrações com portais (contratos de exportação de imóveis). */
export interface PortalIntegration {
  id: string;
  name: string;
  /** Exportação ativa. */
  active: boolean;
  /** Contrato/ligação estabelecida com o portal. */
  contract: boolean;
  lastExport?: string;
  note?: string;
}

export const portalIntegrations: PortalIntegration[] = [
  { id: "idealista", name: "Idealista", active: true, contract: true, lastExport: "2026-07-23T06:00:00" },
  { id: "imovirtual", name: "Imovirtual", active: true, contract: true, lastExport: "2026-07-23T06:00:00" },
  { id: "casasapo", name: "Casa SAPO", active: false, contract: true, note: "Contrato ativo — exportação por ligar." },
  { id: "facebook", name: "Facebook Marketplace", active: false, contract: false, note: "Sem contrato." },
  { id: "greenacres", name: "Green-Acres", active: false, contract: false, note: "Sem contrato." },
  { id: "bpi", name: "BPI Expresso Imobiliário", active: false, contract: false, note: "Sem contrato." },
];

export interface ExportReadiness {
  ready: boolean;
  blockers: string[];
}

/** Condicionalismos que impedem a exportação de um imóvel para os portais. */
export function exportReadiness(p: Property): ExportReadiness {
  const blockers: string[] = [];
  if (p.approval && p.approval !== "aprovado") blockers.push("Não aprovado");
  const st = docStatus(p.documents ?? [], p.sellerType === "empresa");
  if (!st.complete) blockers.push(`${st.missingCount} documento(s) obrigatório(s) em falta`);
  if (p.lat == null || p.lng == null) blockers.push("Sem coordenadas (geolocalização)");
  if (!p.description) blockers.push("Sem descrição");
  if (!p.gallery || p.gallery.length === 0) blockers.push("Sem fotografias");
  return { ready: blockers.length === 0, blockers };
}
