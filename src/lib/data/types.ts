export type Operation = "venda" | "arrendamento";

export type PropertyType =
  | "Apartamento"
  | "Moradia"
  | "Terreno"
  | "Loja"
  | "Escritório";

export type PropertyStatus =
  | "novo"
  | "destaque"
  | "reduzido"
  | "oportunidade"
  | "reservado"
  | "vendido";

export type EnergyRating =
  | "A+"
  | "A"
  | "B"
  | "B-"
  | "C"
  | "D"
  | "E"
  | "F";

export interface Agency {
  id: string;
  name: string;
  /** Public montra slug, e.g. "algarve". */
  slug: string;
  region: string;
  /** Código numérico da agência (2 dígitos) para as referências legíveis. */
  code?: number;
}

/** Papel hierárquico (governa permissões e aprovações). */
/** Papel hierárquico (governa permissões e aprovações).
 *  admin = administração global (marca, várias agências);
 *  diretor = diretor de agência / broker (gere uma agência);
 *  coordenador = coordenação de equipa dentro da agência;
 *  agente / agente_ami = consultor (com AMI próprio = independente). */
export type RoleKey = "superadmin" | "admin" | "diretor" | "coordenador" | "agente" | "agente_ami";

export interface Agent {
  id: string;
  name: string;
  role: string;
  /** Papel hierárquico para permissões/aprovações. */
  roleKey?: RoleKey;
  /** Consultor com AMI próprio (independente): publica sem aprovação da marca,
   *  assumindo responsabilidade e documentação própria. */
  ownAMI?: boolean;
  agency: string;
  /** Link to the Agency this consultant belongs to. */
  agencyId: string;
  /** Código numérico do agente (4 dígitos) para as referências legíveis. */
  code?: number;
  /** Full international phone for wa.me click-to-chat, digits only. */
  whatsapp: string;
  /** Email do consultor (para cópia de comunicações ao agente). */
  email?: string;
  /** Accent color token for the initials-avatar fallback. */
  accent: string;
  /** Headshot under /public/agents; falls back to initials when absent. */
  photo?: string;
}

/** Estado de aprovação de publicação. */
export type ApprovalStatus = "rascunho" | "pendente" | "aprovado" | "rejeitado";

export interface Property {
  id: string;
  /** Public listing reference, e.g. "HP-1024". */
  reference: string;
  title: string;
  operation: Operation;
  type: PropertyType;
  /** Typology: T0–T5, or null for land. */
  typology: string | null;
  price: number;
  /** Gross private area in m². */
  area: number;
  beds: number;
  baths: number;
  parish: string;
  municipality: string;
  /** Distrito — indexação em portais e organização por zona. */
  district?: string;
  /** Empreendimento novo (nova construção): categoria própria na montra e
   *  exportação com a flag de obra nova para os portais. */
  isDevelopment?: boolean;
  /** Nome do empreendimento (ex.: "Jardins do Tejo") quando aplicável. */
  developmentName?: string;
  /** Fase da obra do empreendimento — informa o comprador do estado. */
  developmentStage?: "planta" | "construcao" | "pronto";
  /** Nº total de frações/lotes do empreendimento (informativo). */
  developmentUnits?: number;
  energy: EnergyRating;
  status: PropertyStatus | null;
  /** Cover image path under /public/properties. */
  image: string;
  /** Optional gallery (real photos); cover first. */
  gallery?: string[];
  /** Link de vídeo (YouTube, Vimeo, etc.). */
  videoUrl?: string;
  /** Link do tour virtual 3D (Matterport, etc.). */
  tourUrl?: string;
  /** Pares antes/depois (virtual staging / obras) para o slider interativo. */
  beforeAfter?: { before: string; after: string; label?: string }[];
  /** One-line teaser shown on the listing page. */
  shortDescription?: string;
  /** Full marketing description (paragraphs). */
  description?: string;
  /** Área útil (privativa) em m². */
  areaUtil?: number;
  /** Área dependente (varandas, arrecadação…) em m². */
  areaDependente?: number;
  /** Área de terreno / lote em m² (moradias, terrenos). */
  landArea?: number;
  /** Tem garagem / lugar de estacionamento. */
  garage?: boolean;
  /** Tem elevador. */
  elevator?: boolean;
  /** Ano de construção. */
  constructionYear?: number;
  /** Coordenadas para marcador preciso no mapa; opcional. */
  lat?: number;
  lng?: number;
  /** Base da comissão: percentagem do preço ou valor fixo. */
  commissionType?: "percent" | "fixed";
  /** Comissão em % do preço de venda (quando commissionType = "percent"). */
  commissionPct?: number;
  /** Comissão em € (quando commissionType = "fixed"). */
  commissionFixed?: number;
  /** Justificação interna quando a administração autoriza comissão abaixo do
   *  mínimo do escalão. A presença ativa a exceção. */
  commissionJustification?: string;
  /** Quem autorizou a exceção (admin/coordenação). */
  commissionApprovedBy?: string;
  /** Tipos de documento já carregados (para a nota de documentação). */
  documents?: string[];
  /** Tipo de vendedor — "empresa" exige certidão permanente de empresa. */
  sellerType?: "particular" | "empresa";
  /** Estado de aprovação de publicação. Oculto ao público até "aprovado".
   *  Imóveis de agentes com AMI próprio nascem "aprovado". */
  approval?: ApprovalStatus;
  /** Momento em que foi submetido a aprovação (para o SLA de 24/48h). */
  submittedAt?: string;
  /** Quem aprovou/rejeitou e porquê. */
  approvedBy?: string;
  rejectionReason?: string;
  /** Imóvel EXCLUSIVO/luxury com página dedicada — só quando os critérios de
   *  singularidade e valor comprovado estão cumpridos (ver exclusiveEligibility). */
  exclusive?: boolean;
  /** Frase-assinatura da página exclusiva (curta e editorial). */
  exclusiveTagline?: string;
  /** Narrativa/história do imóvel para a página exclusiva. */
  exclusiveStory?: string;
  /** Justificação da singularidade (o que o torna único). */
  singularityNote?: string;
  /** Angariador principal. */
  agentId: string;
  /** Perfil real do angariador (resolvido do Supabase quando disponível). */
  agent?: Agent;
  /** Co-angariadores (parceria no mesmo imóvel). O contacto/lead aparece a
   *  todos e a comissão é repartida. */
  coAgentIds?: string[];
  /** Repartição da comissão por agente (% que somam 100). Se ausente e houver
   *  co-angariadores, divide-se em partes iguais. */
  commissionSplit?: { agentId: string; pct: number }[];
  /** Engagement proxy 0–100 (visitas + leads + favoritos) for ranking. */
  interest?: number;
  /** ISO date the listing went live, for recency ranking. */
  listedAt?: string;
  /** ISO date sold — present only when status is "vendido". */
  soldAt?: string;
}
