import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listProducts, listPendingOrders } from "@/lib/db/repo";
import { can } from "@/lib/data/permissions";
import { MarketAdmin } from "@/components/xmarket/market-admin";

export const metadata: Metadata = { title: "X Market — administração" };

export default async function XMarketAdminPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  // Só gestão: gerir catálogo ou aprovar despesas.
  const staff =
    session.demo ||
    can(session.agent.roleKey, "manage_market") ||
    can(session.agent.roleKey, "approve_expenses") ||
    session.agent.role === "admin";
  if (!staff) redirect("/app/x-market");

  const [products, pending] = await Promise.all([listProducts(), listPendingOrders()]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app/x-market" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> X Market
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Settings className="size-7 text-primary" /> Administração
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Aprovar encomendas e gerir o catálogo (preços e stock).
          {session.demo && " Em demo, as alterações não são guardadas."}
        </p>

        <div className="mt-6">
          <MarketAdmin products={products} pending={pending} />
        </div>
      </div>
    </div>
  );
}
