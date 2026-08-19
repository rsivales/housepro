"use client";

import * as React from "react";
import { Check, X, Loader2, Save, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABEL,
  type Product,
  type Order,
  type ProductCategory,
} from "@/lib/data/xmarket";

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

export function MarketAdmin({
  products,
  pending: initialPending,
}: {
  products: Product[];
  pending: Order[];
}) {
  const [pending, setPending] = React.useState<Order[]>(initialPending);
  const [list, setList] = React.useState<Product[]>(products);
  const [creating, setCreating] = React.useState(false);

  async function decide(id: string, status: "aprovada" | "cancelada") {
    setPending((p) => p.filter((o) => o.id !== id));
    try {
      await fetch("/api/xmarket/order/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      /* best-effort */
    }
  }

  return (
    <div className="space-y-8">
      {/* Aprovações */}
      <section>
        <h2 className="font-display text-xl">Encomendas por aprovar</h2>
        <ul className="mt-3 space-y-2">
          {pending.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{eur(o.total)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => decide(o.id, "aprovada")}><Check className="size-4" /> Aprovar</Button>
                <Button size="sm" variant="ghost" onClick={() => decide(o.id, "cancelada")}><X className="size-4" /> Rejeitar</Button>
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">Nada por aprovar.</li>
          )}
        </ul>
      </section>

      {/* Catálogo */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Catálogo</h2>
          <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="size-4" /> Novo produto</Button>
        </div>

        {creating && <NewProduct onCreated={(p) => { setList((l) => [p, ...l]); setCreating(false); }} />}

        <div className="mt-3 space-y-2">
          {list.map((p) => <ProductRow key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [price, setPrice] = React.useState(String(product.price));
  const [stock, setStock] = React.useState(product.stock != null ? String(product.stock) : "");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/xmarket/product", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: product.id, price: Number(price), stock: stock ? Number(stock) : undefined }),
      });
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[product.category]}{product.supplier ? ` · ${product.supplier}` : ""}</p>
      </div>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">€
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="input w-20" aria-label="Preço" />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">stock
        <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" className="input w-20" placeholder="—" aria-label="Stock" />
      </label>
      <Button size="sm" variant="ghost" onClick={save} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : <Save className="size-4" />}
      </Button>
    </div>
  );
}

function NewProduct({ onCreated }: { onCreated: (p: Product) => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<ProductCategory>("merchandising");
  const [price, setPrice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    setBusy(true);
    try {
      const res = await fetch("/api/xmarket/product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price) }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.product as Product);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3 shadow-sm">
      <label className="block flex-1">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="input">
          {(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => (<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Preço €</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="input w-24" required />
      </label>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar
      </Button>
    </form>
  );
}
