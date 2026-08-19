import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";

import { Settings } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getWallet, listProducts, listOrders } from "@/lib/db/repo";
import { can } from "@/lib/data/permissions";
import { MarketBoard } from "@/components/xmarket/market-board";

export const metadata: Metadata = { title: "X Market — marketplace e créditos" };

export default async function XMarketPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [wallet, products, orders] = await Promise.all([
    getWallet(session.agent.id, session.agent.name),
    listProducts(),
    listOrders(session.agent.id),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-3xl">
            <Store className="size-7 text-primary" /> X Market
          </h1>
          {(session.demo || can(session.agent.roleKey, "manage_market") || can(session.agent.roleKey, "approve_expenses") || session.agent.role === "admin") && (
            <Link href="/app/x-market/admin" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-secondary">
              <Settings className="size-4 text-primary" /> Administração
            </Link>
          )}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Créditos, serviços e materiais da rede, com carteira, limites e
          aprovações. Pagamentos simulados em desenvolvimento.
          {session.demo && " Dados de exemplo."}
        </p>

        <div className="mt-6">
          <MarketBoard wallet={wallet} products={products} orders={orders} />
        </div>
      </div>
    </div>
  );
}
