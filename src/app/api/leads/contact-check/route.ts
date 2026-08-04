import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import {
  listLeadsByAgent, insertQualityReparo, resolveContactReparo,
  reassignLeadOwner, insertNotifications,
} from "@/lib/db/repo";
import { agentsByAgency } from "@/lib/data/mock";
import {
  contactSlaState, pickReassignTarget, agentWarningMessage, clientReassignMessage, signKeep,
} from "@/lib/data/contact-sla";
import { ABANDONO_RESIDUAL_PCT } from "@/lib/data/quality";
import { notifyGeneric } from "@/lib/notify";

/**
 * SLA de contacto — verificação da ausência de contacto.
 *
 * Corre sobre os contactos "novos" (por atender) do consultor. Sem contacto há
 * +48h → 1.º aviso (reparo de abandono + notificação app/email). Passadas +24h
 * do aviso sem contacto → reatribuição automática a um colega, com email de
 * justificação ao cliente (e opção de manter o consultor).
 *
 * O cliente envia o estado do 1.º aviso por contacto (warnedAt) para o fluxo
 * funcionar também em modo demo; o servidor devolve o estado atualizado.
 *
 * POST { warnedAt?: Record<leadId, iso>, keep?: Record<leadId, true> }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { warnedAt?: Record<string, string>; keep?: Record<string, true> };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const warnedAt = body.warnedAt ?? {};
  const keep = body.keep ?? {};
  const residual = ABANDONO_RESIDUAL_PCT;
  const origin = new URL(request.url).origin;

  const agent = session.agent;
  const leads = await listLeadsByAgent(agent.id);
  const colleagues = agentsByAgency(agent.agencyId).filter((a) => a.id !== agent.id);

  const now = new Date();
  const outcomes: { leadId: string; name: string; outcome: string; toName?: string }[] = [];
  const nextWarned: Record<string, string> = { ...warnedAt };

  for (const lead of leads) {
    const contacted = lead.status !== "novo" || Boolean(lead.contactedAt);
    if (contacted) { delete nextWarned[lead.id]; continue; }

    const state = contactSlaState({
      createdAt: lead.createdAt,
      contacted,
      warnedAt: warnedAt[lead.id],
      now,
    });

    if (state === "warn") {
      await insertQualityReparo({
        agentId: agent.id, category: "abandono",
        reason: `Sem contacto há +48h — ${lead.name}${lead.propertyRef ? ` (${lead.propertyRef})` : ""}`,
        dealRef: `lead:${lead.id}`, status: "ativo", origin: "manual", createdBy: agent.id,
      });
      const msg = agentWarningMessage(lead.name, lead.propertyRef);
      await insertNotifications([{
        userId: agent.id, type: "qualidade", title: "Contacto por atender há +48h",
        body: `${lead.name}: 2.º aviso em 24h reatribui a outro consultor.`, href: "/app/qualidade",
      }]);
      await notifyGeneric({ subject: msg.subject, text: msg.text });
      nextWarned[lead.id] = now.toISOString();
      outcomes.push({ leadId: lead.id, name: lead.name, outcome: "warned" });
      continue;
    }

    if (state === "escalate") {
      if (keep[lead.id]) { // cliente pediu para manter — sem reatribuição
        outcomes.push({ leadId: lead.id, name: lead.name, outcome: "kept" });
        continue;
      }
      const target = pickReassignTarget(colleagues, agent.id);
      if (!target) { outcomes.push({ leadId: lead.id, name: lead.name, outcome: "no_target" }); continue; }

      await reassignLeadOwner(lead.id, target.id);
      await resolveContactReparo(agent.id, `lead:${lead.id}`, target.id, residual);

      const sig = signKeep(lead.id, agent.id);
      const keepUrl = `${origin}/api/leads/keep-consultant?lead=${encodeURIComponent(lead.id)}&a=${encodeURIComponent(agent.id)}&sig=${sig}`;
      const cmsg = clientReassignMessage({
        clientName: lead.name, oldAgentName: agent.name, newAgentName: target.name, keepUrl,
      });
      if (lead.email) await notifyGeneric({ subject: cmsg.subject, text: cmsg.text, to: [lead.email] });

      await insertNotifications([
        { userId: agent.id, type: "qualidade", title: "Contacto reatribuído por ausência",
          body: `${lead.name} passou para ${target.name}. Se fechar, recebes ${residual}% residual.`, href: "/app/qualidade" },
        { userId: target.id, type: "qualidade", title: "Recebeste um contacto reatribuído",
          body: `${lead.name} foi-te atribuído por ausência de contacto do consultor anterior.`, href: "/app" },
      ]);
      await notifyGeneric({
        subject: `HousePro — reatribuição automática por ausência de contacto: ${lead.name}`,
        text: `O contacto ${lead.name} passou de ${agent.name} para ${target.name} (${residual}% residual). Cliente informado com opção de manter o consultor.\n\n— HousePro`,
      });

      delete nextWarned[lead.id];
      outcomes.push({ leadId: lead.id, name: lead.name, outcome: "reassigned", toName: target.name });
    }
  }

  return NextResponse.json({ ok: true, outcomes, warnedAt: nextWarned });
}
