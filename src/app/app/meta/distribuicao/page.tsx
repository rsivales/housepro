import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shuffle } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listCampaigns, listAssignmentRules } from "@/lib/db/repo";
import { agents } from "@/lib/data/mock";
import { CAMPAIGN_TYPE_LABEL, ASSIGN_STRATEGY_LABEL, type AssignmentRule } from "@/lib/data/meta";
import { RuleEditor } from "@/components/meta/rule-editor";

export const metadata: Metadata = { title: "Distribuição — Meta CRM" };

export default async function DistribuicaoPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [campaigns, rules] = await Promise.all([listCampaigns(), listAssignmentRules()]);
  const ruleFor = (id: string): AssignmentRule | undefined =>
    rules.find((r) => r.campaignId === id && r.active) ?? rules.find((r) => r.campaignId === id);

  const agentOptions = agents
    .filter((a) => a.roleKey !== "superadmin" && a.roleKey !== "advogado")
    .map((a) => ({ id: a.id, name: `${a.name} · ${a.agency}` }));

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app/meta" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Meta CRM
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Shuffle className="size-7 text-primary" /> Distribuição
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Como cada campanha distribui as leads — consultor específico, rotação
          (simples ou ponderada), por zona/orçamento/idioma/especialidade, ou pelo
          angariador. Com substituto, fallback e limite diário.
          {session.demo && " Em demo, as alterações não são guardadas."}
        </p>

        <div className="mt-6 space-y-4">
          {campaigns.map((c) => {
            const rule = ruleFor(c.id);
            return (
              <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium leading-tight">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABEL[c.type]}</p>
                  </div>
                  {rule && (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {ASSIGN_STRATEGY_LABEL[rule.strategy]}
                    </span>
                  )}
                </div>
                <div className="mt-3 border-t pt-3">
                  <RuleEditor campaignId={c.id} agents={agentOptions} initial={rule} />
                </div>
              </div>
            );
          })}
          {campaigns.length === 0 && (
            <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Sem campanhas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
