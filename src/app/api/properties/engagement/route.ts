import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { UUID } from "@/lib/portfolio/server";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== new URL(request.url).host)
      return new Response(null, { status: 403 });
  } catch {
    return new Response(null, { status: 403 });
  }
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !UUID.test(String(b.propertyId || "")) ||
    !UUID.test(String(b.key || "")) ||
    !["view", "contact"].includes(b.kind)
  )
    return new Response(null, { status: 400 });
  if (!hasServiceRole()) return new Response(null, { status: 503 });
  const { error } = await createAdminClient().rpc(
    "record_property_engagement",
    { p_property: b.propertyId, p_kind: b.kind, p_key: b.key },
  );
  return error
    ? NextResponse.json({ ok: false }, { status: 503 })
    : new Response(null, { status: 204 });
}
