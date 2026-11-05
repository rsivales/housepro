import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** The public Auth settings expose provider availability, never credentials. */
export async function GET() {
  const headers = { "cache-control": "public, max-age=60" };
  try {
    const { url, anonKey } = getSupabaseEnv();
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error("auth_settings_unavailable");
    const settings = (await response.json()) as { external?: { google?: boolean } };
    return NextResponse.json({ google: settings.external?.google === true }, { headers });
  } catch {
    return NextResponse.json({ google: false }, { headers: { "cache-control": "no-store" } });
  }
}
