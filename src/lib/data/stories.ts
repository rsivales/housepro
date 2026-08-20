/**
 * Histórias reais de clientes.
 *
 * REGRA (obrigatória): NUNCA inventar clientes, nomes, testemunhos ou
 * fotografias. A secção pública só mostra histórias que estejam:
 *  - publicadas (`published`),
 *  - com consentimento válido e autorização de uso no website (`consent`),
 *  - com identificação autorizada (`name`),
 *  - com testemunho verdadeiro (`quote`),
 *  - com vídeo (capa) ou fotografia real (`videoSrc`/`poster`).
 *
 * Enquanto não existirem conteúdos reais, `publishedStories()` devolve [] e a
 * secção fica OCULTA na homepage (não são mostrados cartões vazios nem fundos
 * Navy como substitutos de fotografias de clientes). O estado de preparação
 * vive apenas no admin.
 */
export type StoryOperation = "Compra" | "Venda" | "Arrendamento" | "Investimento";

export interface Story {
  id: string;
  quote: string;
  /** Identificação autorizada pelo cliente. */
  name: string;
  locality: string;
  operation: StoryOperation;
  videoSrc?: string;
  poster?: string;
  transcript?: string;
  /** Gerido no admin: publicado no website. */
  published?: boolean;
  /** Gerido no admin: consentimento válido + autorização de uso no site. */
  consent?: boolean;
}

/**
 * Histórias reais publicadas. Vazio até existirem conteúdos verdadeiros,
 * carregados no admin com consentimento — nunca preencher com exemplos.
 */
export const STORIES: Story[] = [];

/** Só histórias com todos os requisitos cumpridos (nunca fictícias). */
export function publishedStories(all: Story[] = STORIES): Story[] {
  return all.filter(
    (s) =>
      s.published === true &&
      s.consent === true &&
      Boolean(s.name?.trim()) &&
      Boolean(s.quote?.trim()) &&
      Boolean(s.videoSrc || s.poster),
  );
}

export const STORY_OPERATIONS: StoryOperation[] = ["Compra", "Venda", "Arrendamento", "Investimento"];
