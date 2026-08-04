import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { notifyGeneric } from "@/lib/notify";

/**
 * Envia por email o ponto de situação do checklist de escritura a todas as
 * partes (cliente, consultor, coordenação, direção), para garantir que nada
 * falha antes da escritura/mudança.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    dealRef?: string;
    to?: (string | undefined)[];
    done?: number;
    total?: number;
    pending?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const linhas = [
    `Checklist de escritura — ${body.dealRef ?? "negócio"}`,
    `Progresso: ${body.done ?? 0}/${body.total ?? 0} itens concluídos.`,
    "",
    "Pendentes:",
    ...((body.pending ?? []).map((p) => `  • ${p}`)),
    "",
    "— HousePro",
  ];

  const channels = await notifyGeneric({
    subject: `HousePro — escritura ${body.dealRef ?? ""}: verificação do checklist`,
    text: linhas.join("\n"),
    to: body.to,
  });

  return NextResponse.json({ ok: true, channels });
}
