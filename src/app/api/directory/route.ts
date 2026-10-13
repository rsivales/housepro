import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { listAgentsReal, listAgenciesReal } from "@/lib/db/repo";

export async function GET() {
  const session = await getSession();
  const [agents, agencies] = await Promise.all([
    session ? listAgentsReal() : Promise.resolve([]),
    listAgenciesReal(),
  ]);
  // Operational selectors need identities, not private contact details.
  return NextResponse.json({ agents: agents.map(({ email: _email, whatsapp: _whatsapp, ...a }) => ({ ...a, whatsapp: "" })), agencies: agencies.map(({ id, name, slug, region, code }) => ({ id, name, slug, region, code })) }, { headers: { "Cache-Control": "private, no-store" } });
}
