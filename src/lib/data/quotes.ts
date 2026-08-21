/**
 * Frases diárias (§7) — biblioteca de frases motivantes com uma frase por dia,
 * datas comemorativas e de aniversário, e administração central (campanhas
 * especiais via site_settings). A app mostra apenas "Frase do dia" e a data —
 * nunca "142/365" ao agente.
 *
 * A biblioteca cresce até às 365; a escolha do dia é DETERMINÍSTICA (igual para
 * todos, muda todos os dias). As datas especiais têm prioridade.
 */

export type QuoteTag = "geral" | "comemorativa" | "aniversario" | "objetivo";

export interface DailyQuote {
  text: string;
  /** Data especial (MM-DD) — quando definida, tem prioridade nesse dia. */
  date?: string;
  tag?: QuoteTag;
}

/** Frases gerais — a do dia roda por esta lista pelo dia do ano. */
export const GENERAL_QUOTES: string[] = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Não contes os negócios que fizeste. Faz com que cada negócio conte.",
  "Os grandes consultores não nasceram feitos — construíram-se, montra a montra.",
  "A tua próxima conquista está a uma chamada de distância.",
  "Quem planta angariações, colhe carreira.",
  "Confiança ganha-se ao segundo — e mantém-se ao longo do processo.",
  "A melhor angariação é a que nasce de um cliente bem servido.",
  "Foco no cliente, disciplina no seguimento, resultado no fecho.",
  "Cada 'não' aproxima-te do 'sim' que muda o teu mês.",
  "Vende a experiência, não o imóvel. O imóvel vende-se sozinho.",
  "Um bom seguimento vale mais do que dez leads esquecidas.",
  "A rapidez no primeiro contacto é a tua maior vantagem competitiva.",
  "Prepara a reunião como se fosse a mais importante do ano. Um dia será.",
  "O mercado premeia quem aparece — todos os dias, com método.",
  "Ouvir é a arte de vender sem parecer que se vende.",
  "Cada visita é uma oportunidade de aprender algo sobre o cliente.",
  "A tua reputação chega antes de ti. Constrói-a com cada gesto.",
  "Disciplina é escolher entre o que queres agora e o que queres mais.",
  "Networking não é pedir; é servir primeiro.",
  "Um pipeline saudável hoje é a tranquilidade de amanhã.",
  "O detalhe que ninguém vê é o que faz a diferença que todos sentem.",
  "Trata cada proprietário como o dono do imóvel dos teus sonhos.",
  "As objeções são perguntas disfarçadas. Responde com valor.",
  "O consultor de excelência não corre atrás — é procurado.",
  "Consistência bate intensidade. Todos os dias, um pouco.",
  "A confiança do cliente é o teu ativo mais valioso.",
  "Qualifica bem à entrada e fecharás melhor à saída.",
  "O melhor marketing é um cliente satisfeito a falar de ti.",
  "Domina o processo e o preço deixa de ser objeção.",
  "Antes de vender uma casa, vende a certeza de um bom acompanhamento.",
  "Quem conhece o bairro, conquista o cliente.",
  "Transforma cada fecho no início da próxima recomendação.",
  "A energia que levas para a reunião volta em forma de resultado.",
  "Planeia a semana ao domingo; agradece-te à sexta.",
  "Não vendas pressa. Vende confiança.",
  "O seguimento educado abre portas que o talento sozinho não abre.",
  "Cada imóvel tem uma história. Encontra-a e conta-a bem.",
  "Investe em ti: a tua formação é a tua melhor angariação.",
  "Um sorriso ao telefone ouve-se do outro lado.",
  "Trabalha para ser referência, não apenas mais uma opção.",
];

/** Datas especiais (comemorativas) — prioridade no respetivo dia. */
export const SPECIAL_QUOTES: DailyQuote[] = [
  { text: "Feliz Ano Novo! Que este ano seja o da tua melhor carreira.", date: "01-01", tag: "comemorativa" },
  { text: "Dia de Portugal — orgulho em servir quem procura um lar por cá.", date: "06-10", tag: "comemorativa" },
  { text: "Boas Festas! Obrigado por tornares o sonho de tantas famílias realidade.", date: "12-25", tag: "comemorativa" },
];

/** Frase genérica de aniversário (personalizável com o nome). */
export const BIRTHDAY_QUOTE = "Parabéns! Que o teu dia seja tão especial como os clientes que ajudas a realizar sonhos.";

const mmdd = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayOfYear = (d: Date): number =>
  Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);

/**
 * Frase do dia. Prioridade: aniversário do próprio → data comemorativa →
 * frase geral (determinística pelo dia do ano). `extra` são frases da campanha
 * gerida na administração (site_settings).
 */
export function quoteOfDay(
  now: Date = new Date(),
  opts?: { birthday?: string; extra?: DailyQuote[] }
): DailyQuote {
  const today = mmdd(now);
  if (opts?.birthday && opts.birthday === today) {
    return { text: BIRTHDAY_QUOTE, tag: "aniversario" };
  }
  const specials = [...(opts?.extra ?? []), ...SPECIAL_QUOTES].filter((q) => q.date === today);
  if (specials.length) return specials[0];

  const general = [...GENERAL_QUOTES, ...(opts?.extra ?? []).filter((q) => !q.date).map((q) => q.text)];
  return { text: general[dayOfYear(now) % general.length], tag: "geral" };
}

/** Atalho de texto (retrocompatível com o dashboard). */
export function quoteTextOfDay(now: Date = new Date(), extra?: DailyQuote[]): string {
  return quoteOfDay(now, { extra }).text;
}
