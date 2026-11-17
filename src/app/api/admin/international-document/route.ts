import { NextResponse } from "next/server";
import { isSuperadmin } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import type { InternationalCommercial } from "@/lib/db/international";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.demo || !isSuperadmin(session.agent) || !hasServiceRole()) {
    return new Response(null, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const db = createAdminClient();
  const { data } = await db.from("international_catalog").select("commercial").eq("id", params.get("project") ?? "").maybeSingle();
  const document = (data?.commercial as InternationalCommercial | undefined)?.documents?.find(
    (item) => item.path === params.get("file"),
  );
  if (!document) return new Response(null, { status: 404 });
  const { data: signed } = await db.storage.from("international-private").createSignedUrl(document.path, 60, { download: document.name });
  if (!signed) return new Response(null, { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
