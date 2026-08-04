import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Coins, Network, TrendingUp } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getAfilhadosTree } from "@/lib/db/repo";
import { agentPrefixOf } from "@/lib/data/mock";
import { affiliateCode } from "@/lib/codes";
import { DEFAULT_SPLIT, maxOverrideDepth } from "@/lib/commission/split";
import { computeLeg, currentTierLabel } from "@/lib/commission/tiers";
import { formatEuro } from "@/lib/format";
import type { AfilhadoNode } from "@/lib/data/afilhados";

export const metadata: Metadata = { title: "Comissões" };

interface Linha {
  code: string;
  name: string;
  generation: number;
  position: number;
  monthlyGross: number;
  pct: number;
  override: number;
}

/** Percorre a árvore por gerações e produz uma linha por afilhado, com código. */
function linhas(root: AfilhadoNode, prefix: string, maxDepth: number): Linha[] {
  const out: Linha[] = [];
  let frontier = root.children;
  let level = 1;
  while (frontier.length && level <= maxDepth) {
    frontier.forEach((node, i) => {
      const pct = DEFAULT_SPLIT.overrideTiers[level - 1] ?? 0;
      const override = node.active && !node.inactive ? (node.monthlyGross * pct) / 100 : 0;
      out.push({
        code: affiliateCode(prefix, level, i + 1),
        name: node.inactive ? `${node.name} (saiu)` : node.name,
        generation: level,
        position: i + 1,
        monthlyGross: node.monthlyGross,
        pct,
        override,
      });
    });
    frontier = frontier.flatMap((n) => n.children);
    level += 1;
  }
  return out;
}

// Demo: faturação pessoal do ciclo (liga ao acumulador real com o Supabase).
const DEMO_FATURACAO = 72000;

export default async function ComissoesPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const prefix = agentPrefixOf(agent.id);
  const root = await getAfilhadosTree(agent.id, agent.name);
  const rows = linhas(root, prefix, maxOverrideDepth());
  const overrideTotal = rows.reduce((s, r) => s + r.override, 0);

  // Repartição pessoal (com empresa validada, para o exemplo).
  const leg = computeLeg({
    legCommission: DEMO_FATURACAO,
    priorFaturacao: 0,
    priorAgencyTake: 0,
    hasValidatedCompany: true,
  });

  const byGen = Array.from({ length: maxOverrideDepth() }, (_, i) => {
    const gen = i + 1;
    const gr = rows.filter((r) => r.generation === gen);
    return { gen, pct: DEFAULT_SPLIT.overrideTiers[i] ?? 0, count: gr.length, total: gr.reduce((s, r) => s + r.override, 0) };
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Coins className="size-7 text-primary" /> Comissões
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faturação e override organizados pelos códigos legíveis — fácil de conferir e auditar.
          O teu código: <span className="font-mono text-foreground">{prefix}</span>
        </p>

        {/* Resumo pessoal */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="size-3.5" /> Faturação (ciclo)
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums">{formatEuro(DEMO_FATURACAO)}</p>
            <p className="text-xs text-muted-foreground">Patamar {currentTierLabel(DEMO_FATURACAO)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Líquido pessoal (est.)</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{formatEuro(leg.agentNet)}</p>
            <p className="text-xs text-muted-foreground">{leg.agentSplitPct.toFixed(0)}% após deduções</p>
          </div>
          <div className="rounded-2xl border bg-primary p-5 text-primary-foreground shadow-sm">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-primary-foreground/80">
              <Network className="size-3.5" /> Override da rede / mês
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums">{formatEuro(overrideTotal)}</p>
            <p className="text-xs text-primary-foreground/80">{rows.length} afilhados</p>
          </div>
        </div>

        {/* Por geração */}
        <h2 className="mt-8 font-display text-xl">Override por geração</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {byGen.map((g) => (
            <div key={g.gen} className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Geração {g.gen} · {g.pct}%</p>
              <p className="mt-1 font-display text-xl tabular-nums">{formatEuro(g.total)}</p>
              <p className="text-xs text-muted-foreground">{g.count} pessoa(s)</p>
            </div>
          ))}
        </div>

        {/* Detalhe por código */}
        <h2 className="mt-8 font-display text-xl">Detalhe por código</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Afilhado</th>
                <th className="px-4 py-3 font-medium">Ger.</th>
                <th className="px-4 py-3 text-right font-medium">Faturação</th>
                <th className="px-4 py-3 text-right font-medium">%</th>
                <th className="px-4 py-3 text-right font-medium">Override</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b last:border-none">
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums">{r.generation}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatEuro(r.monthlyGross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.pct}%</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{r.override > 0 ? formatEuro(r.override) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-secondary/40 font-medium">
                <td className="px-4 py-3" colSpan={5}>Total override / mês</td>
                <td className="px-4 py-3 text-right font-display tabular-nums">{formatEuro(overrideTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 rounded-xl border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Cada linha é identificável pelo código (<span className="font-mono">{prefix}A1G1</span> = 1.º afilhado
          direto…), o que permite auditar e detetar atribuições erradas de forma simples. Os afilhados que saíram
          mantêm a posição mas não geram override.
        </p>
      </div>
    </div>
  );
}
