import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { ensureBuyerContact } from "@/lib/db/repo";
import {
  recordClientTaskUpload,
  verifyBuyerTaskAccess,
  verifySellerTaskAccess,
} from "@/lib/db/deal-tasks";
import { notifyGeneric } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const detectedMime = (bytes: Uint8Array) => {
  if (Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (
    Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString() === "WEBP"
  )
    return "image/webp";
  return null;
};
const EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Carregamento de documento pelo comprador/vendedor — nunca valida, só
 *  passa a tarefa para 'received'. A validação exige um profissional
 *  autorizado (ver /api/deals/tasks/[taskId]). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  if (!isSupabaseConfigured() || !hasServiceRole())
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const { taskId } = await params;
  const contact = await ensureBuyerContact(user.id, user.email);
  const gate =
    (contact && (await verifyBuyerTaskAccess(taskId, contact.id))) ||
    (await verifySellerTaskAccess(taskId, user.email));
  if (!gate)
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8_000_000)
    return NextResponse.json({ error: "Use um documento até 8 MB." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("document");
  if (!(file instanceof File) || file.size === 0 || file.size > 8 * 1024 * 1024)
    return NextResponse.json(
      { error: "Carregue o documento em PDF, JPG, PNG ou WebP, até 8 MB." },
      { status: 422 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectedMime(bytes);
  if (!mime)
    return NextResponse.json(
      { error: "Formato não reconhecido. Use PDF, JPG, PNG ou WebP." },
      { status: 422 },
    );
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const path = `${gate.dealId}/${taskId}/${randomUUID()}-${hash}.${EXTENSION[mime]}`;

  const db = createAdminClient();
  const { error: uploadError } = await db.storage
    .from("deal-docs")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError)
    return NextResponse.json({ error: "Não foi possível guardar o documento." }, { status: 503 });

  const res = await recordClientTaskUpload(taskId, gate.dealId, gate.audience, path);
  if ("error" in res) {
    await db.storage.from("deal-docs").remove([path]);
    return NextResponse.json({ error: "Não foi possível registar o documento." }, { status: 500 });
  }

  const { data: deal } = await db
    .from("deals")
    .select("transaction_manager_id, coordenador_id")
    .eq("id", gate.dealId)
    .maybeSingle();
  const recipientId = deal?.transaction_manager_id || deal?.coordenador_id;
  if (recipientId) {
    await notifyGeneric({
      subject: "Documento recebido pelo cliente",
      text: `${gate.audience === "buyer" ? "O comprador" : "O vendedor"} carregou um documento no portal. Confirme e valide a tarefa no Helix.`,
      agentId: recipientId,
      privateReport: true,
    });
  }
  return NextResponse.json({ ok: true });
}
