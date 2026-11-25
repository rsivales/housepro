import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { deleteEmailList } from "@/lib/db/repo";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteEmailList(id, session.agent.id);
  if (!ok) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
