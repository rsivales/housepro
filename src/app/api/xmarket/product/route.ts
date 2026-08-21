import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createProduct, updateProduct } from "@/lib/db/repo";
import { can } from "@/lib/data/permissions";
import type { Product } from "@/lib/data/xmarket";

/**
 * X Market admin — catálogo.
 *  POST  cria um produto.        (manage_market)
 *  PATCH atualiza preço/stock…   (manage_market)
 */
function allowed(roleKey: string | undefined, role: string, demo: boolean): boolean {
  return demo || can(roleKey as never, "manage_market") || role === "admin";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!allowed(session.agent.roleKey, session.agent.role, session.demo)) {
    return NextResponse.json({ error: "Sem permissão para gerir o catálogo." }, { status: 403 });
  }

  let body: Partial<Product>;
  try {
    body = (await request.json()) as Partial<Product>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.name || body.price == null) {
    return NextResponse.json({ error: "Faltam nome ou preço." }, { status: 400 });
  }
  const product = await createProduct({
    name: String(body.name),
    category: body.category ?? "outros",
    price: Number(body.price),
    unit: body.unit,
    supplier: body.supplier,
    creditType: body.creditType,
    creditAmount: body.creditAmount,
    stock: body.stock,
    description: body.description,
  });
  return NextResponse.json({ product, demo: session.demo });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!allowed(session.agent.roleKey, session.agent.role, session.demo)) {
    return NextResponse.json({ error: "Sem permissão para gerir o catálogo." }, { status: 403 });
  }

  let body: { id?: string; price?: number; stock?: number; supplier?: string; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Falta id." }, { status: 400 });

  const ok = await updateProduct(String(body.id), {
    price: body.price,
    stock: body.stock,
    supplier: body.supplier,
    active: body.active,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
