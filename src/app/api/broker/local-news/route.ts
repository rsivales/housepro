import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { authorizedAgency } from "@/lib/db/agency-finance";
import type { AgencyNewsItem } from "@/lib/data/types";

const categories = ["Comunidade", "Mercado local", "Recrutamento", "Tecnologia", "Projetos", "Agência"];
async function context(request: Request, mutation = false) {
  const session = await getSession();
  const id = new URL(request.url).searchParams.get("agency") ?? "";
  if (!session || session.demo || (mutation && session.viewingAs) || !hasServiceRole()) return null;
  try { await authorizedAgency(session.agent, id); return id; } catch { return null; }
}
export async function GET(request: Request) {
  const id = await context(request);
  if (!id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { data, error } = await createAdminClient().from("agencies").select("name,news").eq("id", id).single();
  return error ? NextResponse.json({ error: "Dados indisponíveis." }, { status: 503 }) : NextResponse.json({ name: data.name, news: data.news ?? [] });
}
export async function POST(request: Request) {
  const id = await context(request, true);
  if (!id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const b = await request.json().catch(() => null);
  const title = String(b?.title ?? "").trim(), body = String(b?.body ?? "").trim(), category = String(b?.category ?? ""), image = String(b?.image ?? "").trim();
  if (title.length < 8 || title.length > 180 || body.length < 80 || body.length > 12000 || !categories.includes(category) || (image && (!/^https:\/\//.test(image) || image.length > 1000))) return NextResponse.json({ error: "Verifique título, texto, categoria e imagem HTTPS." }, { status: 422 });
  const db = createAdminClient();
  const { data: agency, error: readError } = await db.from("agencies").select("news").eq("id", id).single();
  if (readError) return NextResponse.json({ error: "Agência indisponível." }, { status: 503 });
  const item: AgencyNewsItem = { id: randomUUID(), date: new Date().toISOString(), title, body, category: category as AgencyNewsItem["category"], ...(image ? { image } : {}) };
  const news = [item, ...(Array.isArray(agency.news) ? agency.news : [])].slice(0, 100);
  const { error } = await db.from("agencies").update({ news }).eq("id", id);
  return error ? NextResponse.json({ error: "Não foi possível publicar." }, { status: 503 }) : NextResponse.json({ ok: true, item });
}
