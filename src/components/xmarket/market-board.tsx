"use client";

import * as React from "react";
import { Wallet as WalletIcon, Plus, Minus, ShoppingCart, Loader2, Check, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CREDIT_LABEL,
  CATEGORY_LABEL,
  ORDER_STATUS_LABEL,
  USAGE_ALERT_LABEL,
  usageLevel,
  creditRemaining,
  needsApproval,
  type Wallet,
  type Product,
  type Order,
  type ProductCategory,
  type UsageAlert,
} from "@/lib/data/xmarket";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ALERT_CLASS: Record<UsageAlert, string> = {
  ok: "bg-primary",
  aviso75: "bg-gold",
  aviso90: "bg-gold",
  esgotado: "bg-destructive",
  excedido: "bg-destructive",
};

export function MarketBoard({
  wallet,
  products,
  orders: initialOrders,
}: {
  wallet: Wallet;
  products: Product[];
  orders: Order[];
}) {
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [orders, setOrders] = React.useState<Order[]>(initialOrders);
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);

  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const items = Object.entries(cart).filter(([, q]) => q > 0);
  const total = items.reduce((s, [id, q]) => s + (byId.get(id)?.price ?? 0) * q, 0);
  const willNeedApproval = needsApproval(total, wallet.approvalThreshold);

  const categories = Array.from(new Set(products.map((p) => p.category))) as ProductCategory[];

  function setQty(id: string, delta: number) {
    setCart((prev) => {
      const q = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: q };
    });
  }

  async function checkout() {
    if (items.length === 0) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/xmarket/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map(([id, q]) => {
            const p = byId.get(id)!;
            return { productId: id, name: p.name, qty: q, unitPrice: p.price };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha na encomenda.");
      const order = data.order as Order;
      setOrders((prev) => [order, ...prev]);
      setCart({});
      setFlash(
        order.status === "pendente_aprovacao"
          ? "Encomenda enviada para aprovação (acima do limite da carteira)."
          : "Encomenda paga pela carteira."
      );
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Carteira */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-medium">
            <WalletIcon className="size-5 text-primary" /> A minha carteira
          </p>
          <div className="flex items-center gap-5 text-sm">
            <div><p className="text-xs text-muted-foreground">Saldo</p><p className="font-display text-xl leading-none">{eur(wallet.balance)}</p></div>
            {wallet.monthlyBudget != null && (
              <div><p className="text-xs text-muted-foreground">Mês</p><p className="font-display text-xl leading-none tabular-nums">{eur(wallet.monthlySpent)} <span className="text-sm text-muted-foreground">/ {eur(wallet.monthlyBudget)}</span></p></div>
            )}
            {wallet.approvalThreshold != null && (
              <div><p className="text-xs text-muted-foreground">Aprovação &gt;</p><p className="font-display text-xl leading-none">{eur(wallet.approvalThreshold)}</p></div>
            )}
          </div>
        </div>

        {/* Créditos */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {wallet.credits.map((c) => {
            const { pct, alert } = usageLevel(c);
            return (
              <div key={c.type} className="rounded-xl border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{CREDIT_LABEL[c.type]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.consumed} / {c.included} · {creditRemaining(c) >= 0 ? `${creditRemaining(c)} restantes` : `${-creditRemaining(c)} em excedente`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${ALERT_CLASS[alert]}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                {alert !== "ok" && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <AlertTriangle className="size-3" /> {USAGE_ALERT_LABEL[alert]} · extra {eur(c.unitCostExtra)}/un
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Catálogo */}
      <section>
        <h2 className="font-display text-xl">Catálogo</h2>
        <div className="mt-3 space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[cat]}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {products.filter((p) => p.category === cat).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {eur(p.price)}{p.unit ? ` / ${p.unit}` : ""}{p.supplier ? ` · ${p.supplier}` : ""}
                      </p>
                    </div>
                    {cart[p.id] ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(p.id, -1)} aria-label="Menos" className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><Minus className="size-3.5" /></button>
                        <span className="w-6 text-center text-sm tabular-nums">{cart[p.id]}</span>
                        <button onClick={() => setQty(p.id, 1)} aria-label="Mais" className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><Plus className="size-3.5" /></button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setQty(p.id, 1)}>
                        <Plus className="size-4" /> Adicionar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Carrinho */}
      {items.length > 0 && (
        <section className="sticky bottom-4 rounded-2xl border bg-card p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm">
              <ShoppingCart className="size-4 text-primary" />
              {items.reduce((s, [, q]) => s + q, 0)} artigo(s) · <strong>{eur(total)}</strong>
              {willNeedApproval && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold-foreground">precisa de aprovação</span>}
            </p>
            <Button onClick={checkout} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />} Encomendar
            </Button>
          </div>
          {flash && <p className="mt-2 text-sm text-muted-foreground">{flash}</p>}
        </section>
      )}
      {flash && items.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground shadow-sm">
          <Check className="size-4 text-primary" /> {flash}
        </p>
      )}

      {/* Encomendas */}
      <section>
        <h2 className="font-display text-xl">Encomendas recentes</h2>
        <ul className="mt-3 space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{eur(o.total)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                {ORDER_STATUS_LABEL[o.status]}
              </span>
            </li>
          ))}
          {orders.length === 0 && (
            <li className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">Sem encomendas.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
