import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false, superadmin: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, superadmin: isSuperadmin(session.agent) });
}
