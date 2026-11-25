import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Upload da imagem do email institucional (postal) — guardada no bucket público partilhado com as campanhas. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || !isNetworkFinanceAdmin(session.agent)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Armazenamento indisponível" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !MIME_EXT[file.type] || file.size > 5_000_000 || file.size === 0)
    return NextResponse.json({ error: "Use JPG, PNG ou WebP até 5 MB" }, { status: 400 });
  const path = `institucional/${crypto.randomUUID()}.${MIME_EXT[file.type]}`;
  const db = createAdminClient();
  const { error } = await db.storage.from("campaign-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Falha no envio da imagem" }, { status: 500 });
  return NextResponse.json({ url: db.storage.from("campaign-images").getPublicUrl(path).data.publicUrl });
}
