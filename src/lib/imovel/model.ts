/** Modelo rico do imóvel para carregamento pelo consultor.
 *  Superset dos campos públicos, preparado para exportação (Idealista). */

export interface ImovelDoc {
  name: string;
  kind: string; // ver DOC_KINDS
  validated?: boolean;
  /** Data URL (imagem ou PDF) para pré-visualização/abertura. */
  url?: string;
  /** MIME do ficheiro carregado (image/*, application/pdf). */
  mime?: string;
}

/** Tipos de documento de um imóvel, agrupados. "Herança" só aparece quando
 *  o imóvel provém de uma partilha/herança (exige documentação adicional).
 *  `required` marca os documentos mínimos obrigatórios. */
export const DOC_KINDS: { value: string; label: string; group: "base" | "heranca"; required?: boolean; requiredIfCompany?: boolean }[] = [
  { value: "cmi", label: "Contrato de mediação (CMI)", group: "base", required: true },
  { value: "doc_proprietario", label: "Documentos do proprietário (CC/NIF)", group: "base", required: true },
  { value: "caderneta", label: "Caderneta predial", group: "base", required: true },
  { value: "certidao_predial", label: "Certidão predial permanente", group: "base", required: true },
  { value: "cert_energetico", label: "Certificado energético", group: "base", required: true },
  { value: "licenca_utilizacao", label: "Licença de utilização", group: "base", required: true },
  { value: "planta", label: "Planta", group: "base", required: true },
  { value: "certidao_empresa", label: "Certidão permanente de empresa", group: "base", requiredIfCompany: true },
  { value: "ficha_tecnica", label: "Ficha técnica de habitação", group: "base" },
  { value: "procuracao", label: "Procuração", group: "base" },
  { value: "distrate", label: "Distrate / cancelamento de hipoteca", group: "base" },
  { value: "outro", label: "Outro", group: "base" },
  // Documentos adicionais quando o imóvel vem de herança / partilha
  { value: "habilitacao_herdeiros", label: "Habilitação de herdeiros", group: "heranca" },
  { value: "escritura_partilha", label: "Escritura de partilha", group: "heranca" },
  { value: "certidao_obito", label: "Certidão de óbito", group: "heranca" },
  { value: "imposto_selo_heranca", label: "Imposto do selo (herança)", group: "heranca" },
  { value: "testamento", label: "Testamento", group: "heranca" },
];

export const docLabel = (value: string): string =>
  DOC_KINDS.find((d) => d.value === value)?.label ?? value;

/** Tipos de documento mínimos obrigatórios (base). */
export const REQUIRED_DOC_KINDS = DOC_KINDS.filter((d) => d.required).map((d) => d.value);

/** Documentos obrigatórios tendo em conta o tipo de vendedor (empresa exige
 *  a certidão permanente de empresa). */
export function requiredDocKinds(sellerIsCompany = false): string[] {
  return DOC_KINDS.filter((d) => d.required || (sellerIsCompany && d.requiredIfCompany)).map((d) => d.value);
}

export interface DocStatus {
  /** Obrigatórios ainda por carregar. */
  missing: string[];
  missingCount: number;
  /** Carregados que vão além dos mínimos obrigatórios. */
  extraCount: number;
  /** Total de obrigatórios. */
  requiredTotal: number;
  complete: boolean;
}

/** Estado documental de um imóvel a partir dos tipos já carregados. */
export function docStatus(uploaded: string[] = [], sellerIsCompany = false): DocStatus {
  const required = requiredDocKinds(sellerIsCompany);
  const set = new Set(uploaded);
  const missing = required.filter((k) => !set.has(k));
  const extraCount = uploaded.filter((k) => !required.includes(k)).length;
  return {
    missing,
    missingCount: missing.length,
    extraCount,
    requiredTotal: required.length,
    complete: missing.length === 0,
  };
}

export type WatermarkPos =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const WATERMARK_POSITIONS: WatermarkPos[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export interface ImovelDraft {
  id: string;
  reference: string;
  operation: "venda" | "arrendamento";
  type: string; // Moradia, Apartamento, Terreno, Loja, Escritório
  typology: string; // T0..T5
  price: number;
  /** Base da comissão: percentagem ou valor fixo. */
  comissaoTipo: "percent" | "fixed";
  /** Comissão em % do preço (quando comissaoTipo = "percent"). */
  comissao: number;
  /** Comissão em € (quando comissaoTipo = "fixed"). */
  comissaoFixo: number;
  /** Tipo de vendedor — "empresa" exige certidão permanente de empresa. */
  sellerType: "particular" | "empresa";
  area: number;
  beds: number;
  baths: number;
  parish: string;
  municipality: string;
  /** Coordenadas geocodificadas automaticamente a partir da morada. */
  lat?: number;
  lng?: number;
  energy: string;
  anoConstrucao: string;
  // Características booleanas
  elevador: boolean;
  rampa: boolean;
  estacionamento: boolean;
  // Descritivas
  vista: string;
  equipamentos: string[];
  comunidade: string;
  // Descrição & SEO
  descricaoCurta: string;
  descricao: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  keywords: string;
  // Media & docs (URLs/Storage em produção)
  /** Aplicar a marca de água (o estilo — tamanho/posição/transparência — é
   *  global, definido pelo admin da marca em /admin). */
  watermark: boolean;
  fotosCount: number;
  planta: boolean;
  /** Imóvel proveniente de herança/partilha — exige documentação adicional. */
  heranca: boolean;
  documentos: ImovelDoc[];
}

export const TIPOS = ["Apartamento", "Moradia", "Terreno", "Loja", "Escritório"];
export const TIPOLOGIAS = ["T0", "T1", "T2", "T3", "T4", "T5"];
export const VISTAS = ["Sem vista", "Mar", "Rio", "Serra", "Cidade", "Jardim", "Campo"];
export const ENERGIAS = ["A+", "A", "B", "B-", "C", "D", "E", "F"];

export const EQUIPAMENTOS = [
  "Cozinha equipada",
  "Ar condicionado",
  "Aquecimento central",
  "Painéis solares",
  "Piscina",
  "Garagem",
  "Arrecadação",
  "Domótica",
  "Videovigilância",
  "Roupeiros embutidos",
  "Varanda",
  "Terraço",
];

/** Gera um slug SEO a partir do título. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function blankImovel(id: string): ImovelDraft {
  return {
    id,
    reference: "",
    operation: "venda",
    type: "Apartamento",
    typology: "T2",
    price: 0,
    comissaoTipo: "percent",
    comissao: 5,
    comissaoFixo: 0,
    sellerType: "particular",
    area: 0,
    beds: 2,
    baths: 1,
    parish: "",
    municipality: "",
    energy: "C",
    anoConstrucao: "",
    elevador: false,
    rampa: false,
    estacionamento: false,
    vista: "Sem vista",
    equipamentos: [],
    comunidade: "",
    descricaoCurta: "",
    descricao: "",
    seoTitle: "",
    seoDescription: "",
    slug: "",
    keywords: "",
    watermark: true,
    fotosCount: 0,
    planta: false,
    heranca: false,
    documentos: [],
  };
}
