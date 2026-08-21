import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createOrder } from "@/lib/db/repo";
import type { OrderItem } from "@/lib/data/xmarket";

/**
 * X Market — cria uma encomenda. A regra de aprovação (acima do limite da
 * carteira) é aplicada no servidor. Pagamento simulado em desenvolvimento.
 *  POST { items: [{ productId, name, qty, unitPrice }] }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { items?: OrderItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "O carrinho está vazio." }, { status: 400 });
  }

  const order = await createOrder({
    buyerId: session.agent.id,
    buyerName: session.agent.name,
    items: body.items.map((i) => ({
      productId: String(i.productId ?? ""),
      name: String(i.name ?? ""),
      qty: Math.max(1, Number(i.qty ?? 1)),
      unitPrice: Number(i.unitPrice ?? 0),
    })),
  });
  return NextResponse.json({ order, demo: session.demo });
}
