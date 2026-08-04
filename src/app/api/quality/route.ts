import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SEVERITY, ABANDONO_RESIDUAL_PCT, type QualitySeverity } from "@/lib/data/quality";
import { insertNotifications } from "@/lib/db/repo";
import { agentById } from "@/lib/data/mock";
import { notifyGeneric } from "@/lib/notify";

/**
 * Módulo Qualidade — escada de escalonamento do livro-razão de reputação.
 *
 * POST { action, ... }
 *   reparo   (coordenação/direção) → cria "reparo de qualidade" (ativo, 0 pts/0 €)
 *   resolve  (o próprio agente)    → reparo "resolvido"
 *   triage   (coordenação/direção) → decide um "pendente" do portal:
 *                                    → to:"reparo" | "infracao" | "arquivar"
 *   reassign (coordenação/direção) → abandono: reatribui a um colega (10% residual)
 *   propose  (coordenação/direção) → cria infração "proposta"
 *   contest  (o próprio agente)    → passa a "contestada" com nota
 *   confirm  (coordenação/direção) → "confirmada": aplica pontos + € na comissão
 *   cancel   (coordenação/direção) → "anulada": sem efeito
 *
 * Só a infração CONFIRMADA desconta pontos e gera penalização monetária que
 * compensa no próximo acerto de comissão. Best-effort no Supabase; em demo
 * devolve ok para o fluxo ser testável ponta a ponta.
 */

const STAFF = new Set(["coordenador", "diretor", "admin"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const roleKey = session.agent.roleKey ?? "";
  const isStaff = STAFF.has(roleKey) || session.agent.role === "admin";

  const configured = isSupabaseConfigured();
  const supabase = configured ? await createClient() : null;

  if (action === "propose") {
    if (!isStaff) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
    const agentId = String(body.agentId ?? "").trim();
    const severity = String(body.severity ?? "leve") as QualitySeverity;
    const category = body.category ? String(body.category) : undefined;
    const reason = String(body.reason ?? "").trim();
    const dealRef = body.dealRef ? String(body.dealRef) : undefined;
    if (!agentId || !reason) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    const sev = SEVERITY[severity] ?? SEVERITY.leve;

    if (supabase) {
      try {
        await supabase.from("quality_events").insert({
          kind: "infracao", agent_id: agentId, category, severity,
          points: -sev.points, amount: sev.amount, reason, status: "proposta",
          deal_ref: dealRef, created_by: session.agent.id,
        });
      } catch {/* best-effort */}
    }
    // Notifica o consultor (pode contestar em 48h).
    await insertNotifications([{
      userId: agentId, type: "qualidade",
      title: `Infração proposta (${sev.label})`,
      body: reason, amount: sev.amount, href: "/app/qualidade",
    }]);
    await notifyGeneric({
      subject: `HousePro — Qualidade: infração proposta (${sev.label})`,
      text: `Foi proposta uma infração ${sev.label}: ${reason}\nPodes contestar em /app/qualidade dentro de 48h.\n\n— HousePro`,
    });
    return NextResponse.json({ ok: true, severity, points: -sev.points, amount: sev.amount });
  }

  if (action === "contest") {
    const id = String(body.id ?? "").trim();
    const note = String(body.note ?? "").trim();
    if (!id) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    if (supabase) {
      try {
        // Só o próprio agente (RLS reforça): passa a contestada.
        await supabase.from("quality_events")
          .update({ status: "contestada", contest_note: note })
          .eq("id", id).eq("agent_id", session.agent.id);
      } catch {/* best-effort */}
    }
    await notifyGeneric({
      subject: "HousePro — Qualidade: infração contestada",
      text: `O consultor ${session.agent.name} contestou uma infração.\nMotivo: ${note || "(sem nota)"}\n\n— HousePro`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm" || action === "cancel") {
    if (!isStaff) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
    const id = String(body.id ?? "").trim();
    const agentId = String(body.agentId ?? "").trim();
    if (!id) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    const status = action === "confirm" ? "confirmada" : "anulada";
    if (supabase) {
      try {
        await supabase.from("quality_events")
          .update({ status, decided_by: session.agent.id })
          .eq("id", id);
      } catch {/* best-effort */}
    }
    if (agentId) {
      await insertNotifications([{
        userId: agentId, type: "qualidade",
        title: action === "confirm" ? "Infração confirmada" : "Infração anulada",
        body: action === "confirm"
          ? "A penalização será compensada no próximo acerto de comissão."
          : "A infração foi anulada, sem efeito na tua reputação.",
        href: "/app/qualidade",
      }]);
    }
    return NextResponse.json({ ok: true, status });
  }

  if (action === "reparo") {
    if (!isStaff) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
    const agentId = String(body.agentId ?? "").trim();
    const category = body.category ? String(body.category) : "reclamacao";
    const reason = String(body.reason ?? "").trim();
    if (!agentId || !reason) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    if (supabase) {
      try {
        await supabase.from("quality_events").insert({
          kind: "reparo", agent_id: agentId, category, points: 0, amount: 0,
          reason, status: "ativo", origin: "manual", created_by: session.agent.id,
        });
      } catch {/* best-effort */}
    }
    await insertNotifications([{
      userId: agentId, type: "qualidade",
      title: "Reparo de qualidade",
      body: `${reason} — corrige para não escalar.`, href: "/app/qualidade",
    }]);
    return NextResponse.json({ ok: true, status: "ativo" });
  }

  if (action === "resolve") {
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    if (supabase) {
      try {
        await supabase.from("quality_events")
          .update({ status: "resolvido" })
          .eq("id", id)
          .eq("kind", "reparo");
      } catch {/* best-effort */}
    }
    return NextResponse.json({ ok: true, status: "resolvido" });
  }

  if (action === "triage") {
    if (!isStaff) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
    const id = String(body.id ?? "").trim();
    const agentId = String(body.agentId ?? "").trim();
    const to = String(body.to ?? ""); // reparo | infracao | arquivar
    if (!id) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });

    if (to === "arquivar") {
      if (supabase) {
        try {
          await supabase.from("quality_events")
            .update({ status: "arquivada", decided_by: session.agent.id })
            .eq("id", id);
        } catch {/* best-effort */}
      }
      return NextResponse.json({ ok: true, status: "arquivada" });
    }

    if (to === "reparo") {
      if (supabase) {
        try {
          await supabase.from("quality_events")
            .update({ status: "ativo", kind: "reparo", decided_by: session.agent.id })
            .eq("id", id);
        } catch {/* best-effort */}
      }
      if (agentId) {
        await insertNotifications([{
          userId: agentId, type: "qualidade",
          title: "Reparo de qualidade (do portal)",
          body: "A Qualidade analisou uma ocorrência do cliente. Corrige para não escalar.",
          href: "/app/qualidade",
        }]);
      }
      return NextResponse.json({ ok: true, status: "ativo" });
    }

    if (to === "infracao") {
      const severity = String(body.severity ?? "media") as QualitySeverity;
      const sev = SEVERITY[severity] ?? SEVERITY.media;
      if (supabase) {
        try {
          await supabase.from("quality_events")
            .update({
              status: "proposta", kind: "infracao", severity,
              points: -sev.points, amount: sev.amount, decided_by: session.agent.id,
            })
            .eq("id", id);
        } catch {/* best-effort */}
      }
      if (agentId) {
        await insertNotifications([{
          userId: agentId, type: "qualidade",
          title: `Infração proposta (${sev.label})`,
          body: "Resultou de uma ocorrência do portal. Podes contestar.",
          amount: sev.amount, href: "/app/qualidade",
        }]);
      }
      return NextResponse.json({ ok: true, status: "proposta", severity });
    }

    return NextResponse.json({ error: "triagem_invalida" }, { status: 400 });
  }

  if (action === "reassign") {
    if (!isStaff) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
    const id = String(body.id ?? "").trim();
    const agentId = String(body.agentId ?? "").trim();
    const toAgentId = String(body.toAgentId ?? "").trim();
    if (!agentId || !toAgentId) return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
    const toName = agentById(toAgentId)?.name ?? "colega";

    if (supabase) {
      try {
        if (id) {
          await supabase.from("quality_events")
            .update({
              kind: "reparo", category: "abandono", status: "resolvido",
              reassigned_to: toAgentId, residual_pct: ABANDONO_RESIDUAL_PCT,
              decided_by: session.agent.id,
            })
            .eq("id", id);
        } else {
          await supabase.from("quality_events").insert({
            kind: "reparo", agent_id: agentId, category: "abandono",
            points: 0, amount: 0, status: "resolvido", origin: "manual",
            reason: `Abandono de contacto — reatribuído a ${toName} (${ABANDONO_RESIDUAL_PCT}% residual)`,
            reassigned_to: toAgentId, residual_pct: ABANDONO_RESIDUAL_PCT,
            created_by: session.agent.id,
          });
        }
      } catch {/* best-effort */}
    }
    // Aviso prévio ao consultor + notificação ao colega que recebe o contacto.
    await insertNotifications([
      {
        userId: agentId, type: "qualidade",
        title: "Contacto reatribuído por abandono",
        body: `Por falta de acompanhamento, o contacto passou para ${toName}. Se fechar, recebes ${ABANDONO_RESIDUAL_PCT}% residual (em vez dos 25% de uma referência).`,
        href: "/app/qualidade",
      },
      {
        userId: toAgentId, type: "qualidade",
        title: "Recebeste um contacto reatribuído",
        body: "Um contacto foi-te atribuído pela coordenação (abandono do anterior consultor).",
        href: "/app/crm",
      },
    ]);
    await notifyGeneric({
      subject: "HousePro — Qualidade: reatribuição por abandono de contacto",
      text: `Contacto reatribuído para ${toName} com ${ABANDONO_RESIDUAL_PCT}% residual ao consultor anterior.\n\n— HousePro`,
    });
    return NextResponse.json({ ok: true, toAgentId, residualPct: ABANDONO_RESIDUAL_PCT });
  }

  return NextResponse.json({ error: "acao_desconhecida" }, { status: 400 });
}
