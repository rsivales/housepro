import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createVisit, updateVisit } from "@/lib/db/repo";
import type { VisitKind } from "@/lib/data/contacts";

const kinds: VisitKind[] = ["visita", "reuniao", "avaliacao", "outro"];
const uuid = (v: unknown) => typeof v === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
function parseEvent(body: Record<string, unknown> | null) {
  if (!body || !kinds.includes(body.kind as VisitKind) || typeof body.at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(body.at) || !Number.isFinite(Date.parse(body.at))) return null;
  const at = new Date(body.at);
  if (at.toISOString() !== body.at || at.toISOString().slice(0, 10) < "2000-01-01") return null;
  const durationMin = body.durationMin == null || body.durationMin === "" ? 60 : Number(body.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 1440) return null;
  for (const key of ["contactName", "propertyRef", "location", "note"] as const) if (body[key] != null && (typeof body[key] !== "string" || (body[key] as string).length > (key === "note" ? 2000 : 250))) return null;
  return { kind: body.kind as VisitKind, at: at.toISOString(), durationMin,
    contactName: (body.contactName as string | undefined)?.trim() || undefined,
    propertyRef: (body.propertyRef as string | undefined)?.trim() || undefined,
    location: (body.location as string | undefined)?.trim() || undefined,
    note: (body.note as string | undefined)?.trim() || undefined };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const event = parseEvent(body);
  if (!event) return NextResponse.json({ error: "Indica tipo, data, hora e duração válidos." }, { status: 422 });
  try {
    const visit = await createVisit({ ownerId: session.agent.id, ...event });
    return NextResponse.json({ visit, demo: session.demo });
  } catch { return NextResponse.json({ error: "Não foi possível guardar o evento." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const event = parseEvent(body);
  if (!uuid(body?.id) || !event) return NextResponse.json({ error: "Evento ou dados inválidos." }, { status: 422 });
  try {
    const visit = await updateVisit(session.agent.id, body.id, event);
    if (!visit) return NextResponse.json({ error: "Evento não encontrado na tua agenda." }, { status: 404 });
    return NextResponse.json({ visit, demo: session.demo });
  } catch { return NextResponse.json({ error: "Não foi possível atualizar o evento." }, { status: 503 }); }
}
