import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const slug = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const b = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!b || !String(b.name ?? "").trim()) return NextResponse.json({ error: "Indique o nome do empreendimento." }, { status: 400 });
  const sb = await createClient();
  const { data, error } = await sb.from("developments").insert({ responsible_agent_id: session.agent.id, name: String(b.name), slug: `${slug(String(b.name))}-${Date.now().toString(36)}`, municipality: b.municipality || null, parish: b.parish || null, summary: b.summary || null, description: b.description || null, stage: b.stage || "planta" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const units = Array.isArray(b.units) ? b.units : [];
  if (units.length) await sb.from("development_units").insert(units.map((u: Record<string, unknown>) => ({ development_id: data.id, title: u.title || null, typology: u.typology || null, price: Number(u.price) || null, area: Number(u.area) || null })));
  return NextResponse.json({ ok: true, id: data.id });
}
