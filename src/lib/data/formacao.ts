/**
 * Formação — academia HousePro. Percursos com aulas, progresso do consultor
 * (guardado localmente por agora) e certificação interna ao concluir. Alimenta
 * a qualificação da equipa e prepara novos consultores.
 */

export type CourseLevel = "iniciacao" | "intermedio" | "avancado";
export type CourseCategory = "angariacao" | "venda" | "juridico" | "marketing" | "etica" | "ferramentas";

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  iniciacao: "Iniciação",
  intermedio: "Intermédio",
  avancado: "Avançado",
};

export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  angariacao: "Angariação",
  venda: "Venda",
  juridico: "Jurídico & documentação",
  marketing: "Marketing & imagem",
  etica: "Ética & qualidade",
  ferramentas: "Ferramentas HousePro",
};

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  /** Ligação opcional para um recurso interno (ex.: guião, ferramenta). */
  href?: string;
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  level: CourseLevel;
  category: CourseCategory;
  lessons: Lesson[];
  /** Emoji de capa (evita imagens externas). */
  cover: string;
}

export const COURSES: Course[] = [
  {
    id: "onboarding",
    title: "Bem-vindo à HousePro",
    summary: "Os primeiros passos: valores, marca, CRM e o teu código de consultor.",
    level: "iniciacao",
    category: "ferramentas",
    cover: "🚀",
    lessons: [
      { id: "l1", title: "A marca e a promessa HousePro", minutes: 8 },
      { id: "l2", title: "A tua área profissional e o CRM", minutes: 12, href: "/app/crm" },
      { id: "l3", title: "O teu código e as referências legíveis", minutes: 7 },
      { id: "l4", title: "Ética e o módulo Qualidade", minutes: 10, href: "/app/qualidade" },
    ],
  },
  {
    id: "angariar",
    title: "Angariar com método",
    summary: "Do primeiro contacto ao mandato em exclusivo, com o guião de angariação.",
    level: "intermedio",
    category: "angariacao",
    cover: "🏷️",
    lessons: [
      { id: "l1", title: "Preparar a visita de angariação", minutes: 10 },
      { id: "l2", title: "Descoberta: motivação e prazo", minutes: 9 },
      { id: "l3", title: "Apresentar o plano e o valor", minutes: 12, href: "/app/guioes" },
      { id: "l4", title: "Preço, exclusividade e fecho", minutes: 14 },
      { id: "l5", title: "Documentação obrigatória", minutes: 11 },
    ],
  },
  {
    id: "vender",
    title: "Acompanhar o comprador",
    summary: "Qualificar, visitar, recolher feedback e converter em proposta.",
    level: "intermedio",
    category: "venda",
    cover: "🤝",
    lessons: [
      { id: "l1", title: "Qualificação e capacidade financeira", minutes: 10 },
      { id: "l2", title: "A visita orientada", minutes: 9 },
      { id: "l3", title: "Feedback e sinais de compra", minutes: 8, href: "/app/guioes" },
      { id: "l4", title: "Da proposta ao CPCV", minutes: 12 },
    ],
  },
  {
    id: "juridico",
    title: "Documentação & escritura",
    summary: "O que é preciso em cada fase, IMT e Imposto de Selo, e o checklist de escritura.",
    level: "avancado",
    category: "juridico",
    cover: "📄",
    lessons: [
      { id: "l1", title: "Documentos por tipo de imóvel e vendedor", minutes: 13 },
      { id: "l2", title: "IMT e Imposto de Selo na prática", minutes: 12, href: "/ferramentas/imt" },
      { id: "l3", title: "CPCV e escritura: o checklist", minutes: 14 },
      { id: "l4", title: "Mudança de serviços e entrega de chaves", minutes: 8 },
    ],
  },
  {
    id: "marketing",
    title: "Imagem que vende",
    summary: "Fotografia, vídeo, virtual staging e exportação para portais.",
    level: "intermedio",
    category: "marketing",
    cover: "📸",
    lessons: [
      { id: "l1", title: "Preparar o imóvel para as fotos", minutes: 9 },
      { id: "l2", title: "Virtual staging: antes/depois", minutes: 10, href: "/app/imovel/novo" },
      { id: "l3", title: "Exportar para Idealista e Facebook", minutes: 11, href: "/app/portais" },
    ],
  },
  {
    id: "etica",
    title: "Ética, qualidade e reputação",
    summary: "Boas práticas, SLA de contacto, reparos e o que evita infrações.",
    level: "iniciacao",
    category: "etica",
    cover: "⚖️",
    lessons: [
      { id: "l1", title: "O compromisso com o cliente", minutes: 8 },
      { id: "l2", title: "SLA de contacto e abandono", minutes: 9 },
      { id: "l3", title: "Reparos, infrações e devido processo", minutes: 10, href: "/app/qualidade" },
    ],
  },
];

export function courseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export function courseMinutes(c: Course): number {
  return c.lessons.reduce((s, l) => s + l.minutes, 0);
}
