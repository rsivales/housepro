"use client";

import * as React from "react";
import Link from "next/link";
import { Settings, ExternalLink, Stamp } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import {
  ORDERING_LABELS,
  ORDERING_RULES,
  type OrderingRule,
} from "@/lib/data/ordering";
import { siteConfig, HOME_RULE_KEY, WATERMARK_KEY, defaultWatermark, type WatermarkConfig } from "@/lib/config";
import { WATERMARK_POSITIONS } from "@/lib/imovel/model";
import { allReferrals, REFERRAL_STATUS } from "@/lib/data/referrals";
import { Handshake } from "lucide-react";

export default function AdminPage() {
  const [rule, setRule] = React.useState<OrderingRule>(siteConfig.homeMoreRule);
  const [wm, setWm] = React.useState<WatermarkConfig>(defaultWatermark);

  React.useEffect(() => {
    const stored = localStorage.getItem(HOME_RULE_KEY) as OrderingRule | null;
    if (stored && stored in ORDERING_LABELS) setRule(stored);
    const wmRaw = localStorage.getItem(WATERMARK_KEY);
    if (wmRaw) {
      try {
        setWm({ ...defaultWatermark, ...JSON.parse(wmRaw) });
      } catch {}
    }
  }, []);

  function choose(r: OrderingRule) {
    setRule(r);
    localStorage.setItem(HOME_RULE_KEY, r);
  }

  function patchWm(p: Partial<WatermarkConfig>) {
    setWm((prev) => {
      const next = { ...prev, ...p };
      localStorage.setItem(WATERMARK_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Settings className="size-4" /> Back office (protótipo)
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Configuração do site</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Definições editáveis pela marca/coordenador. Nesta fase são guardadas
          no navegador; com o back office (M5 + autenticação) passam a ser
          persistidas no Supabase.
        </p>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-medium">
            Homepage · secção “Mais imóveis para si”
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Que imóveis mostrar abaixo dos destaques.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ORDERING_RULES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => choose(r)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  rule === r
                    ? "border-primary bg-primary/5 font-medium text-foreground"
                    : "hover:bg-secondary"
                )}
              >
                {ORDERING_LABELS[r]}
              </button>
            ))}
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver a homepage <ExternalLink className="size-3.5" />
          </Link>
        </div>

        {/* Marca de água — estilo GLOBAL */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Stamp className="size-4 text-primary" /> Marca de água (global)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aplica-se a <strong>todas as fotos de todos os imóveis e agências</strong>, para o
            site ser consistente. Só a marca (admin) altera estes controlos — o consultor apenas
            liga/desliga por imóvel.
          </p>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {/* Pré-visualização */}
            <div>
              <p className="mb-2 text-sm font-medium">Pré-visualização</p>
              <WatermarkPreview cfg={wm} />
            </div>

            {/* Controlos */}
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Texto</span>
                <input
                  value={wm.label}
                  onChange={(e) => patchWm({ label: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </label>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Tamanho</span>
                  <span className="text-muted-foreground">{wm.size}%</span>
                </div>
                <input
                  type="range" min={2} max={14} value={wm.size}
                  onChange={(e) => patchWm({ size: Number(e.target.value) })}
                  className="mt-2 w-full accent-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Transparência</span>
                  <span className="text-muted-foreground">{wm.opacity}%</span>
                </div>
                <input
                  type="range" min={20} max={100} value={wm.opacity}
                  onChange={(e) => patchWm({ opacity: Number(e.target.value) })}
                  className="mt-2 w-full accent-primary"
                />
              </div>

              <div>
                <p className="text-sm font-medium">Posição</p>
                <div className="mt-2 grid w-24 grid-cols-3 gap-1">
                  {WATERMARK_POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => patchWm({ position: pos })}
                      aria-label={pos}
                      className={cn(
                        "aspect-square rounded-sm border transition-colors",
                        wm.position === pos
                          ? "border-primary bg-primary"
                          : "border-border bg-background hover:bg-secondary"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registo de referências (gestor/admin) */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Handshake className="size-4 text-primary" /> Referências (registo)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as referências da rede — entre consultores e de clientes — com a
            percentagem acordada. Registo transparente para gestor e marca.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Origem → Destino</th>
                  <th className="py-2 pr-3 font-medium">Imóvel</th>
                  <th className="py-2 pr-3 font-medium">%</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {allReferrals().map((r) => {
                  const st = REFERRAL_STATUS[r.status];
                  const destino = r.type === "cliente" ? r.agencyName : r.toName;
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{r.clientName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {r.fromName} <span className="text-foreground">→</span> {destino}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.propertyRef ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-semibold text-primary">{r.sharePct}%</td>
                      <td className="py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", st.badge)}>
                          <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Mostra o posicionamento/tamanho/transparência sobre um retângulo de exemplo. */
function WatermarkPreview({ cfg }: { cfg: WatermarkConfig }) {
  const pos = cfg.position;
  const justify = pos.endsWith("left") ? "flex-start" : pos.endsWith("right") ? "flex-end" : "center";
  const align = pos.startsWith("top") ? "flex-start" : pos.startsWith("bottom") ? "flex-end" : "center";
  return (
    <div
      className="relative flex aspect-[4/3] w-full overflow-hidden rounded-lg border bg-gradient-to-br from-primary/25 via-secondary to-primary/10 p-3"
      style={{ justifyContent: justify, alignItems: align }}
    >
      <span
        className="rounded-md px-2 py-1 font-semibold text-white"
        style={{
          fontSize: `${Math.max(9, cfg.size * 2.2)}px`,
          backgroundColor: `rgba(20,40,32,${0.55 * (cfg.opacity / 100)})`,
          opacity: cfg.opacity / 100,
        }}
      >
        {cfg.label || "HousePro"}
      </span>
    </div>
  );
}
