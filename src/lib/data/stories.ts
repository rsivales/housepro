/**
 * Histórias reais de clientes. Geridas (no futuro) pelo admin com registo de
 * consentimento. Privacidade: SEM documentos legíveis, assinaturas, NIF,
 * moradas completas, valores não autorizados ou rostos sem consentimento.
 *
 * `videoSrc`/`poster` entram pelo admin quando há vídeo com consentimento;
 * na ausência mostra-se apenas a citação (capa Deep Navy).
 */
export type StoryOperation = "Compra" | "Venda" | "Arrendamento" | "Investimento";

export interface Story {
  id: string;
  quote: string;
  name: string;
  locality: string;
  operation: StoryOperation;
  videoSrc?: string;
  poster?: string;
  transcript?: string;
}

export const STORIES: Story[] = [
  {
    id: "ana-miguel",
    quote: "Sentimo-nos acompanhados do primeiro contacto à escritura.",
    name: "Ana e Miguel",
    locality: "Faro",
    operation: "Compra",
  },
  {
    id: "carla",
    quote: "Venderam a minha casa em poucas semanas, com um preço justo e sem stress.",
    name: "Carla",
    locality: "Portimão",
    operation: "Venda",
  },
  {
    id: "joao",
    quote: "Explicaram-me a rentabilidade com números claros. Investi com confiança.",
    name: "João",
    locality: "Lisboa",
    operation: "Investimento",
  },
  {
    id: "sofia",
    quote: "Encontrei o apartamento certo para arrendar sem perder tempo com visitas a mais.",
    name: "Sofia",
    locality: "Porto",
    operation: "Arrendamento",
  },
];

export const STORY_OPERATIONS: StoryOperation[] = ["Compra", "Venda", "Arrendamento", "Investimento"];
