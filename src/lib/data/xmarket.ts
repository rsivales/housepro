/**
 * X Market — marketplace interno: produtos, serviços, consumos e créditos.
 *
 * O nome do módulo é sempre "X Market". Cobre a CARTEIRA (saldo + créditos
 * incluídos/consumidos), os LIMITES e alertas (75/90/100%), a aprovação acima
 * de um valor, e o CATÁLOGO com encomendas. Pagamentos/consumos são simulados
 * em desenvolvimento (sem ligar serviços pagos).
 */

// ── Créditos ─────────────────────────────────────────────────────────────────

export type CreditType = "email" | "sms" | "whatsapp" | "xcall" | "meta_ads";

export const CREDIT_LABEL: Record<CreditType, string> = {
  email: "Emails",
  sms: "SMS",
  whatsapp: "WhatsApp",
  xcall: "Minutos X Call",
  meta_ads: "Publicidade Meta (€)",
};

export interface CreditBalance {
  type: CreditType;
  /** Incluídos no plano (por mês). */
  included: number;
  /** Consumidos no período. */
  consumed: number;
  /** Custo unitário além do incluído (€). */
  unitCostExtra: number;
}

/** Restantes (pode ficar negativo → excedente faturado). */
export const creditRemaining = (c: CreditBalance): number => c.included - c.consumed;

/** Custo do excedente (unidades acima do incluído × custo unitário). */
export const extraCost = (c: CreditBalance): number =>
  Math.max(0, c.consumed - c.included) * c.unitCostExtra;

export type UsageAlert = "ok" | "aviso75" | "aviso90" | "esgotado" | "excedido";

/** Nível de utilização de um crédito, com os alertas a 75/90/100%. */
export function usageLevel(c: CreditBalance): { pct: number; alert: UsageAlert } {
  if (c.included <= 0) return { pct: 0, alert: "ok" };
  const pct = Math.round((c.consumed / c.included) * 100);
  let alert: UsageAlert = "ok";
  if (c.consumed > c.included) alert = "excedido";
  else if (pct >= 100) alert = "esgotado";
  else if (pct >= 90) alert = "aviso90";
  else if (pct >= 75) alert = "aviso75";
  return { pct, alert };
}

export const USAGE_ALERT_LABEL: Record<UsageAlert, string> = {
  ok: "Ok",
  aviso75: "75% usado",
  aviso90: "90% usado",
  esgotado: "Esgotado",
  excedido: "Excedido",
};

// ── Carteira ─────────────────────────────────────────────────────────────────

export type WalletScope = "agent" | "team" | "agency" | "cost_center";

export const WALLET_SCOPE_LABEL: Record<WalletScope, string> = {
  agent: "Consultor",
  team: "Equipa",
  agency: "Agência",
  cost_center: "Centro de custos",
};

export interface Wallet {
  id: string;
  scope: WalletScope;
  ownerId: string;
  ownerName?: string;
  /** Saldo monetário disponível (€). */
  balance: number;
  /** Orçamento mensal (€), para alertas de gasto. */
  monthlyBudget?: number;
  /** Gasto já feito no mês (€). */
  monthlySpent: number;
  /** Compras acima deste valor exigem aprovação (€). Ausente = sem aprovação. */
  approvalThreshold?: number;
  /** Bloquear quando não há saldo (em vez de faturar excedente). */
  blockWhenEmpty?: boolean;
  credits: CreditBalance[];
}

export const walletCredit = (w: Wallet, type: CreditType): CreditBalance | undefined =>
  w.credits.find((c) => c.type === type);

/** Uma compra deste valor precisa de aprovação? Função pura. */
export function needsApproval(amount: number, threshold?: number): boolean {
  return threshold != null && amount > threshold;
}

/** A carteira suporta este valor? (saldo, e orçamento mensal se definido). */
export function canAfford(wallet: Wallet, amount: number): boolean {
  if (wallet.balance < amount) return false;
  if (wallet.monthlyBudget != null && wallet.monthlySpent + amount > wallet.monthlyBudget) return false;
  return true;
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "creditos"
  | "publicidade"
  | "destaques"
  | "media"
  | "sinaletica"
  | "impressos"
  | "merchandising"
  | "servicos"
  | "formacao"
  | "eventos"
  | "outros";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  creditos: "Créditos",
  publicidade: "Publicidade",
  destaques: "Destaques em portais",
  media: "Fotografia / vídeo / drone",
  sinaletica: "Placas e sinalética",
  impressos: "Flyers, cartões e brochuras",
  merchandising: "Roupa e merchandising",
  servicos: "Serviços (jurídico, tradução, design)",
  formacao: "Formação",
  eventos: "Eventos",
  outros: "Outros",
};

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Preço unitário (€). */
  price: number;
  unit?: string;
  supplier?: string;
  /** Crédito que este produto recarrega (quando aplicável). */
  creditType?: CreditType;
  creditAmount?: number;
  stock?: number;
  description?: string;
}

// ── Encomendas ───────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pendente_aprovacao"
  | "aprovada"
  | "paga"
  | "enviada"
  | "entregue"
  | "cancelada"
  | "reembolsada";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pendente_aprovacao: "Pendente de aprovação",
  aprovada: "Aprovada",
  paga: "Paga",
  enviada: "Enviada",
  entregue: "Entregue",
  cancelada: "Cancelada",
  reembolsada: "Reembolsada",
};

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export const orderTotal = (items: OrderItem[]): number =>
  items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

// ── Dados de exemplo ─────────────────────────────────────────────────────────

export const demoProducts: Product[] = [
  { id: "p-email", name: "Pacote 1.000 emails", category: "creditos", price: 9, unit: "pacote", creditType: "email", creditAmount: 1000 },
  { id: "p-sms", name: "Pacote 200 SMS", category: "creditos", price: 12, unit: "pacote", creditType: "sms", creditAmount: 200 },
  { id: "p-metaads", name: "Saldo publicidade Meta 50€", category: "publicidade", price: 50, unit: "saldo", creditType: "meta_ads", creditAmount: 50, supplier: "Meta" },
  { id: "p-destaque", name: "Destaque Idealista 15 dias", category: "destaques", price: 39, unit: "anúncio", supplier: "Idealista" },
  { id: "p-foto", name: "Reportagem fotográfica", category: "media", price: 85, unit: "sessão", supplier: "Studio Lux" },
  { id: "p-drone", name: "Vídeo aéreo (drone)", category: "media", price: 120, unit: "sessão", supplier: "Studio Lux" },
  { id: "p-placa", name: "Placa 'Vende-se' A2", category: "sinaletica", price: 18, unit: "un", stock: 40 },
  { id: "p-flyer", name: "500 flyers A5", category: "impressos", price: 45, unit: "pack", stock: 999 },
  { id: "p-cartoes", name: "250 cartões de visita", category: "impressos", price: 22, unit: "pack", stock: 999 },
  { id: "p-polo", name: "Polo HousePro", category: "merchandising", price: 24, unit: "un", stock: 60 },
  { id: "p-juridico", name: "Consulta jurídica (LegalFlow)", category: "servicos", price: 60, unit: "consulta" },
  { id: "p-traducao", name: "Tradução de anúncio (EN)", category: "servicos", price: 15, unit: "anúncio" },
];

export const productsByCategory = (cat?: ProductCategory): Product[] =>
  cat ? demoProducts.filter((p) => p.category === cat) : demoProducts;

export function demoWallet(ownerId: string, ownerName?: string): Wallet {
  return {
    id: `w-${ownerId}`,
    scope: "agent",
    ownerId,
    ownerName,
    balance: 120,
    monthlyBudget: 300,
    monthlySpent: 96,
    approvalThreshold: 100,
    blockWhenEmpty: false,
    credits: [
      { type: "email", included: 2000, consumed: 1450, unitCostExtra: 0.008 },
      { type: "sms", included: 200, consumed: 190, unitCostExtra: 0.06 },
      { type: "whatsapp", included: 500, consumed: 120, unitCostExtra: 0.04 },
      { type: "xcall", included: 300, consumed: 60, unitCostExtra: 0.05 },
    ],
  };
}

export const demoOrders: Order[] = [
  {
    id: "o-1",
    buyerId: "rui",
    buyerName: "Rui Tavares",
    items: [{ productId: "p-destaque", name: "Destaque Idealista 15 dias", qty: 1, unitPrice: 39 }],
    total: 39,
    status: "entregue",
    createdAt: "2026-08-14T10:00:00",
  },
  {
    id: "o-2",
    buyerId: "rui",
    buyerName: "Rui Tavares",
    items: [{ productId: "p-drone", name: "Vídeo aéreo (drone)", qty: 1, unitPrice: 120 }],
    total: 120,
    status: "pendente_aprovacao",
    createdAt: "2026-08-18T09:00:00",
  },
];

export const ordersByBuyer = (buyerId: string): Order[] =>
  demoOrders
    .filter((o) => o.buyerId === buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
