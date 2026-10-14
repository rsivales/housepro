import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

/** Browser session hints never authorize professional navigation. */
export async function GET() {
  const headers = { "cache-control": "private, no-store" };
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return NextResponse.json({ professional: false }, { status: 401, headers });
    const { data: profile, error: profileError } = await db.from("profiles").select("id,active").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ professional: false }, { status: 503, headers });
    if (!profile || profile.active === false) return NextResponse.json({ professional: false }, { status: 403, headers });
    return NextResponse.json({ professional: true, destination: "/app" }, { headers });
  } catch {
    return NextResponse.json({ professional: false }, { status: 503, headers });
  }
}
