import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin, isBrandAdmin } from "@/lib/data/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false, superadmin: false, brandAdmin: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    networkFinanceAdmin: isNetworkFinanceAdmin(session.agent),
    superadmin: isSuperadmin(session.agent),
    brandAdmin: isBrandAdmin(session.agent),
  });
}
