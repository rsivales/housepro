/**
 * Recrutamento — modelo, benefícios e vagas. Geridas (no futuro) pelo admin:
 * vaga, localização, estado, candidaturas, origem e recrutador responsável.
 */
export interface Vacancy {
  id: string;
  title: string;
  location: string;
  type: string;
  summary: string;
  active: boolean;
}

export const VACANCIES: Vacancy[] = [
  {
    id: "consultor-algarve",
    title: "Consultor(a) imobiliário(a)",
    location: "Algarve",
    type: "Full-time",
    summary: "Angariação e acompanhamento de clientes com apoio de tecnologia e formação contínua.",
    active: true,
  },
  {
    id: "consultor-lisboa",
    title: "Consultor(a) imobiliário(a)",
    location: "Lisboa",
    type: "Full-time",
    summary: "Junta-te a uma equipa que cresce, com CRM próprio e leads qualificadas.",
    active: true,
  },
  {
    id: "coordenador-porto",
    title: "Coordenador(a) de equipa",
    location: "Porto",
    type: "Full-time",
    summary: "Lidera e desenvolve uma equipa de consultores numa das zonas de maior procura.",
    active: true,
  },
];

export const BENEFITS = [
  { title: "Formação contínua", desc: "Academia interna e acompanhamento próximo desde o primeiro dia." },
  { title: "Tecnologia própria", desc: "CRM Helix, leads qualificadas e ferramentas que poupam tempo." },
  { title: "Equipa que cresce contigo", desc: "Plano de progressão claro e cultura de entreajuda." },
  { title: "Comissões competitivas", desc: "Um modelo de remuneração transparente e motivador." },
];

export const CAREER_FAQ = [
  {
    q: "Preciso de experiência prévia?",
    a: "Não é obrigatória. Valorizamos atitude, empatia e vontade de aprender — a formação nós damos.",
  },
  {
    q: "Como é o processo de recrutamento?",
    a: "Recebemos a tua candidatura, marcamos uma conversa e apresentamos-te o modelo. Simples e transparente.",
  },
  {
    q: "Trabalho por conta própria ou pela HousePro?",
    a: "Temos modelos para ambos os perfis. Explicamos as opções na primeira conversa.",
  },
];
