import type { RoleKey } from "@/lib/data/types";
export type PortfolioCaps = {
  viewAgency: boolean;
  editAgency: boolean;
  approveAgency: boolean;
  duplicate: boolean;
  global: boolean;
  ownAMI: boolean;
};
export type PortfolioItem = {
  id: string;
  reference: string;
  title: string;
  image: string | null;
  municipality: string;
  typology: string | null;
  price: number;
  area: number | null;
  areaUtil: number | null;
  beds: number | null;
  baths: number | null;
  agentId: string;
  agentName: string;
  agencyId: string;
  agencyName: string;
  approval: string;
  listingState: string;
  status: string;
  state: string;
  stateSince: string | null;
  listedAt: string | null;
  developmentName: string | null;
  isDevelopment: boolean;
  unitLabel: string | null;
  documentKinds: string[] | null;
  documents: string[];
  sellerType: string;
  licenseEndorsed: boolean;
  rejectionReason: string | null;
  signaturePending: boolean;
  views: number;
  contactClicks: number;
  leads: number;
  priceDrops: { from: number; to: number; at: string }[];
  dropCount: number;
  canEdit: boolean;
  canDuplicate: boolean;
  canApprove: boolean;
};
export type PortfolioReport = {
  items: PortfolioItem[];
  capabilities: PortfolioCaps;
  trackingSince: string;
  agents: { id: string; name: string; agencyId: string }[];
  viewerId: string;
  readOnly: boolean;
};
export type UnitDraft = {
  label: string;
  title: string;
  typology: string;
  price: number;
  area: number;
  areaUtil: number | null;
  beds: number;
  baths: number;
};
export type PermissionSettings = Partial<
  Record<
    RoleKey,
    Partial<
      Pick<
        PortfolioCaps,
        "viewAgency" | "editAgency" | "approveAgency" | "duplicate"
      >
    >
  >
>;
export const STATE_LABEL: Record<string, string> = {
  activo: "Ativo",
  inactivo: "Inativo",
  pendente: "Pendente",
  rascunho: "Rascunho",
  rejeitado: "Rejeitado",
  off_market: "Fora de mercado",
  reservado: "Reservado",
  cpcv: "CPCV",
  vendido: "Vendido",
};
export function daysSince(iso: string | null, now = Date.now()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t)
    ? Math.max(0, Math.floor((now - t) / 86400000))
    : null;
}
export function generateUnits(
  source: PortfolioItem,
  count: number,
  prefix: string,
  start: number,
): UnitDraft[] {
  return Array.from({ length: count }, (_, i) => {
    const label =
      count === 1 && !prefix
        ? ""
        : `${prefix}${String(start + i).padStart(2, "0")}`;
    return {
      label,
      title: label
        ? `${source.title.slice(0, 250 - (` · Fração ${label}`).length)} · Fração ${label}`
        : `${source.title.slice(0, 235)} · Cópia`,
      typology: source.typology || "",
      price: source.price,
      area: source.area ?? 0,
      areaUtil: source.areaUtil,
      beds: source.beds ?? 0,
      baths: source.baths ?? 0,
    };
  });
}
export function validUnits(value: unknown): value is UnitDraft[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100)
    return false;
  const labels = new Set<string>();
  return value.every((u) => {
    if (
      !u ||
      typeof u !== "object" ||
      typeof u.title !== "string" ||
      !u.title.trim() ||
      u.title.length > 250 ||
      typeof u.label !== "string" ||
      u.label.length > 50 ||
      typeof u.typology !== "string" ||
      u.typology.length > 15
    )
      return false;
    if (u.label && labels.has(u.label.trim())) return false;
    if (u.label) labels.add(u.label.trim());
    return (
      ["price", "area", "beds", "baths"].every(
        (k) => typeof u[k] === "number" && Number.isFinite(u[k]) && u[k] >= 0,
      ) &&
      Number.isInteger(u.beds) &&
      Number.isInteger(u.baths) &&
      (u.areaUtil == null ||
        (typeof u.areaUtil === "number" &&
          Number.isFinite(u.areaUtil) &&
          u.areaUtil >= 0))
    );
  });
}

/** Publication visibility is distinct from the commercial reserved/sold label. */
export function operationalState(p: Pick<PortfolioItem, "state">) {
  return p.state === "reservado"
    ? "activo"
    : ["vendido", "cpcv"].includes(p.state)
      ? "inactivo"
      : p.state;
}

export function preserveUnitEdits(
  generated: UnitDraft[],
  previous: UnitDraft[],
  edited: Set<string>,
): UnitDraft[] {
  return generated.map((unit, index) => ({
    ...unit,
    ...Object.fromEntries(
      (Object.keys(unit) as (keyof UnitDraft)[])
        .filter((key) => previous[index] && edited.has(`${index}:${key}`))
        .map((key) => [key, previous[index][key]]),
    ),
  }));
}
