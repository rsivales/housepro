/** Modelo rico do imóvel para carregamento pelo consultor.
 *  Superset dos campos públicos, preparado para exportação (Idealista). */

export interface ImovelDoc {
  name: string;
  kind: string; // caderneta | cert_energetico | planta | mandato | outro
  validated?: boolean;
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
  area: number;
  beds: number;
  baths: number;
  parish: string;
  municipality: string;
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
  watermark: boolean;
  /** Tamanho da marca de água em % da largura da foto (~6–40). */
  watermarkSize: number;
  /** Posição: top-left | top-center | … | center | … | bottom-right. */
  watermarkPos: WatermarkPos;
  fotosCount: number;
  planta: boolean;
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
    watermarkSize: 18,
    watermarkPos: "bottom-right",
    fotosCount: 0,
    planta: false,
    documentos: [],
  };
}
