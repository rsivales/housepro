import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured() || !hasServiceRole()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const input = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100 || /[<>\r\n]/.test(name)) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const { data, error } = await createAdminClient().from("contacts").update({ name }).eq("auth_user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, name });
}
