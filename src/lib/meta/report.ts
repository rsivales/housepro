import type { Lead } from "@/lib/data/leads";
import type { Campaign } from "@/lib/data/meta";
import { isCommercialCampaign } from "@/lib/data/meta";

/**
 * Relatórios do módulo Meta CRM.
 *
 * REGRA IMPORTANTE (pedido do negócio): o RECRUTAMENTO é reportado SEPARADO do
 * comercial. `commercial` nunca inclui leads de campanhas de recrutamento e
 * vice-versa, para os números comerciais não ficarem inflacionados.
 */

export interface SegmentReport {
  total: number;
  qualified: number;
  disqualified: number;
  unassigned: number;
  /** Taxa de qualificação (qualificadas / total), 0–100. */
  qualifiedRate: number;
  /** Pontuação média (0–100). */
  avgScore: number;
}

export interface CampaignReportRow {
  campaignId: string;
  name: string;
  type: Campaign["type"];
  isCommercial: boolean;
  count: number;
  qualified: number;
  unassigned: number;
}

export interface MetaReport {
  commercial: SegmentReport;
  recruitment: SegmentReport;
  byPipeline: Record<string, number>;
  byCampaign: CampaignReportRow[];
  byProvider: Record<"meta" | "tiktok", number>;
  byDestination: { agentId: string; count: number }[];
  avgFirstResponseMinutes: number | null;
  slaComplianceRate: number | null;
}

function segment(leads: Lead[]): SegmentReport {
  const total = leads.length;
  const qualified = leads.filter((l) => l.qualification === "qualificado").length;
  const disqualified = leads.filter((l) => l.qualification === "desqualificado").length;
  const unassigned = leads.filter((l) => l.unassigned).length;
  const scoreSum = leads.reduce((s, l) => s + (l.score ?? 0), 0);
  return {
    total,
    qualified,
    disqualified,
    unassigned,
    qualifiedRate: total ? Math.round((qualified / total) * 100) : 0,
    avgScore: total ? Math.round(scoreSum / total) : 0,
  };
}

export function buildMetaReport(leads: Lead[], campaigns: Campaign[]): MetaReport {
  const byId = new Map(campaigns.map((c) => [c.id, c]));

  const isRecruitment = (l: Lead): boolean => {
    const c = l.campaignId ? byId.get(l.campaignId) : undefined;
    if (c) return c.type === "RECRUITMENT";
    return l.pipeline === "recrutamento";
  };

  const recruitmentLeads = leads.filter(isRecruitment);
  const commercialLeads = leads.filter((l) => !isRecruitment(l));

  const byPipeline: Record<string, number> = {};
  const byProvider: Record<"meta" | "tiktok", number> = { meta: 0, tiktok: 0 };
  const destinationCounts = new Map<string, number>();
  const responseMinutes: number[] = [];
  for (const l of leads) {
    const k = l.pipeline ?? "compradores";
    byPipeline[k] = (byPipeline[k] ?? 0) + 1;
    const provider = l.provider === "tiktok" || l.source === "tiktok" ? "tiktok" : "meta";
    byProvider[provider] += 1;
    const destination = l.assignedAgentId ?? "broker_inbox";
    destinationCounts.set(destination, (destinationCounts.get(destination) ?? 0) + 1);
    if (l.contactedAt) {
      const minutes = (new Date(l.contactedAt).getTime() - new Date(l.createdAt).getTime()) / 60_000;
      if (Number.isFinite(minutes) && minutes >= 0) responseMinutes.push(minutes);
    }
  }

  const byCampaign: CampaignReportRow[] = campaigns.map((c) => {
    const cl = leads.filter((l) => l.campaignId === c.id);
    return {
      campaignId: c.id,
      name: c.name,
      type: c.type,
      isCommercial: isCommercialCampaign(c.type),
      count: cl.length,
      qualified: cl.filter((l) => l.qualification === "qualificado").length,
      unassigned: cl.filter((l) => l.unassigned).length,
    };
  });

  return {
    commercial: segment(commercialLeads),
    recruitment: segment(recruitmentLeads),
    byPipeline,
    byCampaign,
    byProvider,
    byDestination: [...destinationCounts.entries()]
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count),
    avgFirstResponseMinutes: responseMinutes.length
      ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
      : null,
    slaComplianceRate: responseMinutes.length
      ? Math.round((responseMinutes.filter((value) => value <= 24 * 60).length / responseMinutes.length) * 100)
      : null,
  };
}
