/**
 * Dados legais OBRIGATÓRIOS da agência de mediação (requisito legal para operar).
 * Sem estes completos, a agência fica marcada como incompleta (gate operacional).
 * Protótipo em browser; em produção persiste nas colunas de `agencies` (0016).
 */

export interface AgencyLegal {
  amiLicense: string;   // nº de licença AMI
  amiExpires: string;   // validade (ISO date)
  nipc: string;         // NIPC
  cae: string;          // CAE
  legalEmail: string;   // email da direção/legal
  /** Comprovativos carregados por tipo (url/dataURL). */
  docs: Partial<Record<AgencyDocKind, string>>;
}

export type AgencyDocKind =
  | "ami_comprovativo"
  | "certidao_permanente"
  | "registo_comercial"
  | "seguro_rc";

export const AGENCY_DOCS: { kind: AgencyDocKind; label: string; required: boolean }[] = [
  { kind: "ami_comprovativo", label: "Comprovativo de licença AMI", required: true },
  { kind: "certidao_permanente", label: "Certidão permanente da empresa", required: true },
  { kind: "registo_comercial", label: "Certidão do registo comercial (CIPC)", required: true },
  { kind: "seguro_rc", label: "Seguro de responsabilidade civil", required: true },
];

export const REQUIRED_FIELDS: (keyof AgencyLegal)[] = ["amiLicense", "amiExpires", "nipc", "cae", "legalEmail"];

export function blankLegal(): AgencyLegal {
  return { amiLicense: "", amiExpires: "", nipc: "", cae: "", legalEmail: "", docs: {} };
}

export interface LegalStatus {
  missingFields: string[];
  missingDocs: AgencyDocKind[];
  amiExpired: boolean;
  complete: boolean;
}

export function legalStatus(l: AgencyLegal, now = new Date()): LegalStatus {
  const missingFields = REQUIRED_FIELDS.filter((f) => !String(l[f] ?? "").trim());
  const missingDocs = AGENCY_DOCS.filter((d) => d.required && !l.docs[d.kind]).map((d) => d.kind);
  const amiExpired = Boolean(l.amiExpires && new Date(l.amiExpires) < now);
  return {
    missingFields: missingFields.map(String),
    missingDocs,
    amiExpired,
    complete: missingFields.length === 0 && missingDocs.length === 0 && !amiExpired,
  };
}

export const LEGAL_STORAGE_KEY = "housepro:agencyLegal";
