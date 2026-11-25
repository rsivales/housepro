import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientPortalProfile, markPortalOnboarded } from "@/lib/db/client-portal";

/** Marca o mini tutorial de boas-vindas como visto — não volta a aparecer. */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const profile = await getClientPortalProfile(user.id, user.email);
  if (!profile)
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const res = await markPortalOnboarded(profile.contactId);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true });
}
