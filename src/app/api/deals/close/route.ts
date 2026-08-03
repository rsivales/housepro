import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getUplineChain, addMonthlyGross, insertNotifications } from "@/lib/db/repo";
import { overrideChain, overrideChainTotal } from "@/lib/commission/override-chain";
import { effectiveCommission } from "@/lib/data/commission";
import { computeSplit } from "@/lib/commission/split";
import { notifyGeneric } from "@/lib/notify";
import { formatEuro } from "@/lib/format";

/**
 * Fecho de negócio → faturação + override de rede + notificações.
 *
 * Fecha o ciclo dos afilhados: quando um negócio conclui, credita a comissão
 * bruta ao consultor produtor, distribui o override pela sua cadeia de
 * padrinhos e notifica cada um com o valor estimado a receber.
 *
 * POST { producerId, producerName?, amount, commissionPct?, dealRef? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const producerId = String(body.producerId ?? "").trim();
  const producerName = body.producerName ? String(body.producerName) : undefined;
  const amount = Number(body.amount ?? 0);
  const commissionPct = body.commissionPct != null ? Number(body.commissionPct) : 5;
  const dealRef = body.dealRef ? String(body.dealRef) : undefined;

  if (!producerId || amount <= 0) {
    return NextResponse.json({ error: "producer_or_amount_missing" }, { status: 400 });
  }

  // Comissão bruta do negócio (aplica mínimos por escalão).
  const gross = effectiveCommission(amount, { commissionType: "percent", commissionPct }).amount;

  // Repartição da comissão do produtor (informativa).
  const upline = await getUplineChain(producerId);
  const split = computeSplit(gross, upline.length);
  const payouts = overrideChain(gross, upline);

  // 1) Credita a faturação do mês ao produtor.
  await addMonthlyGross(producerId, gross);

  // 2) Notifica cada padrinho com o override estimado.
  const notifRows = payouts
    .filter((p) => p.amount > 0)
    .map((p) => ({
      userId: p.agentId,
      type: "override",
      title: `Override de rede: +${formatEuro(p.amount)}`,
      body: `${producerName ?? "Um afilhado"} fechou um negócio${dealRef ? ` (${dealRef})` : ""}. Recebe ${p.pct}% (nível ${p.level}) sobre a comissão.`,
      amount: p.amount,
      href: "/app/equipa",
    }));
  await insertNotifications(notifRows);

  // 3) Canal externo (webhook/email), se configurado.
  if (notifRows.length > 0) {
    await notifyGeneric({
      subject: "HousePro — override de rede gerado",
      text:
        `Negócio fechado por ${producerName ?? producerId}${dealRef ? ` (${dealRef})` : ""}.\n` +
        `Comissão bruta: ${formatEuro(gross)}.\n` +
        payouts
          .filter((p) => p.amount > 0)
          .map((p) => `Nível ${p.level} (${p.agentName ?? p.agentId}): ${p.pct}% = ${formatEuro(p.amount)}`)
          .join("\n"),
    });
  }

  return NextResponse.json({
    ok: true,
    gross,
    commissionPct,
    producerNet: split.agent,
    producerNetPct: split.agentPct,
    payouts,
    overrideTotal: overrideChainTotal(payouts),
    notified: notifRows.length,
    persisted: notifRows.length, // no-op em modo demo (best-effort)
  });
}
