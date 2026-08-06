import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getUplineChain, addMonthlyGross, getMonthlyGross, getAgentCompanyValidated, insertNotifications } from "@/lib/db/repo";
import { overrideChain, overrideChainTotal } from "@/lib/commission/override-chain";
import { effectiveCommission } from "@/lib/data/commission";
import { computeLeg } from "@/lib/commission/tiers";
import { COMMISSION } from "@/lib/commission/config";
import { buildPayouts } from "@/lib/data/payments";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
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

  // Repartição da comissão do produtor pela ESCADA (fonte única). A faturação
  // anterior determina o patamar; assume empresa validada para o exemplo.
  const upline = await getUplineChain(producerId);
  const prior = await getMonthlyGross(producerId);
  const hasCompany = await getAgentCompanyValidated(producerId);
  const split = computeLeg({
    legCommission: gross,
    priorFaturacao: prior,
    priorAgencyTake: 0,
    hasValidatedCompany: hasCompany,
  });
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

  // 4) Faturação → pagamentos: linhas por beneficiário (produção, override,
  //    royalties e 2% do fundo de pensão). Persistência best-effort.
  const royalties = Math.round((gross * COMMISSION.royaltiesPct) / 100);
  const pension = Math.round((gross * COMMISSION.pensionPct) / 100);
  const payoutLines = buildPayouts({
    dealRef: dealRef ?? "negócio",
    producerId,
    producerName: producerName ?? producerId,
    producerNet: split.agentNet,
    royalties,
    pension,
    agencyId: session.agent.agencyId,
    overrides: payouts.filter((p) => p.amount > 0).map((p) => ({ agentId: p.agentId, name: p.agentName ?? p.agentId, amount: p.amount })),
  });
  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      await supabase.from("payouts").insert(
        payoutLines.map((l) => ({
          deal_ref: l.dealRef, beneficiary_id: l.beneficiaryId, beneficiary_name: l.beneficiaryName,
          role: l.role, amount: l.amount, status: l.status,
        }))
      );
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({
    ok: true,
    gross,
    commissionPct,
    producerNet: split.agentNet,
    producerNetPct: split.agentSplitPct,
    payouts,
    payoutLines,
    royalties,
    pension,
    overrideTotal: overrideChainTotal(payouts),
    notified: notifRows.length,
    persisted: notifRows.length, // no-op em modo demo (best-effort)
  });
}
