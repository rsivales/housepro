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
import { WATERMARK_POSITIONS, docStatus } from "@/lib/imovel/model";
import { allReferrals, REFERRAL_STATUS } from "@/lib/data/referrals";
import { Handshake, Building2, Users, Briefcase, ShieldAlert, TrendingUp, ShieldCheck, ShieldHalf, Rss, AlertTriangle, ChevronRight } from "lucide-react";
import { properties, agencies, agentsByAgency, propertiesByAgency, pendingApprovals } from "@/lib/data/mock";
import { demoDeals, stagePercent } from "@/lib/data/deal";
import { commissionLabel } from "@/lib/data/commission";
import { PropertyRef } from "@/components/property/property-ref";
import { formatEuro } from "@/lib/format";

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

  const activos = properties.filter((p) => p.status !== "vendido");
  const pipelineValue = demoDeals
    .filter((d) => d.stage !== "cancelado")
    .reduce((s, d) => s + d.amount, 0);
  const excecoes = properties.filter((p) => p.commissionJustification);
  const pendentes = pendingApprovals();
  const docMissingCount = properties.filter(
    (p) => p.status !== "vendido" && !docStatus(p.documents ?? [], p.sellerType === "empresa").complete
  ).length;

  const kpis = [
    { icon: Building2, label: "Imóveis ativos", value: String(activos.length) },
    { icon: Briefcase, label: "Negócios em curso", value: String(demoDeals.length) },
    { icon: TrendingUp, label: "Valor em pipeline", value: formatEuro(pipelineValue) },
    { icon: Users, label: "Consultores", value: String(agencies.reduce((s, a) => s + agentsByAgency(a.id).length, 0)) },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Settings className="size-4" /> Back office · Admin · Coordenação · Gestão
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Painel de gestão</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Visão da marca e das agências. Em produção, a autenticação e as políticas
          RLS mostram a cada perfil apenas o que lhe compete (admin vê tudo;
          coordenação vê a sua agência).
        </p>

        {/* KPIs */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <k.icon className="size-5" />
              </div>
              <p className="mt-3 font-display text-2xl">{k.value}</p>
              <p className="text-sm text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </section>

        {/* Alerta vermelho + atalhos de gestão */}
        {(pendentes.length > 0 || docMissingCount > 0) && (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="size-5" /> Atenção necessária
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {pendentes.length > 0 && (
                <span>
                  <span className="font-semibold text-destructive">{pendentes.length}</span> imóvel(is) a aguardar aprovação
                </span>
              )}
              {docMissingCount > 0 && (
                <span>
                  <span className="font-semibold text-destructive">{docMissingCount}</span> com documentos obrigatórios em falta
                </span>
              )}
            </div>
            <Link href="/admin/aprovacoes" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline">
              Tratar agora <ChevronRight className="size-4" />
            </Link>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <NavCard href="/admin/aprovacoes" icon={ShieldCheck} title="Aprovações" note={`${pendentes.length} pendente(s) · SLA 24–48h`} alert={pendentes.length > 0} />
          <NavCard href="/admin/permissoes" icon={ShieldHalf} title="Permissões" note="Hierarquia · quem aprova/vê" />
          <NavCard href="/admin/exportacoes" icon={Rss} title="Exportações & portais" note="Contratos e estado por imóvel" />
        </section>

        {/* Pipeline de negócios */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Briefcase className="size-4 text-primary" /> Negócios (pipeline)
          </h2>
          <div className="mt-4 space-y-3">
            {demoDeals.map((d) => {
              const pct = stagePercent(d.stage);
              return (
                <div key={d.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      <PropertyRef propertyId={d.propertyId} label={d.propertyTitle} />
                    </p>
                    <span className="text-sm text-muted-foreground">{d.reference} · {formatEuro(d.amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.location}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipa & agências */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Building2 className="size-4 text-primary" /> Agências & equipa
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agencies.map((a) => {
              const team = agentsByAgency(a.id);
              const listings = propertiesByAgency(a.id).length;
              return (
                <div key={a.id} className="rounded-xl border p-4">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.region}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span><span className="font-semibold">{team.length}</span> <span className="text-muted-foreground">consultores</span></span>
                    <span><span className="font-semibold">{listings}</span> <span className="text-muted-foreground">imóveis</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exceções de comissão (autorizações abaixo do mínimo) */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="size-4 text-primary" /> Exceções de comissão
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comissões autorizadas <strong>abaixo do mínimo</strong> do escalão. Cada
            exceção exige justificação interna e fica registada.
          </p>
          {excecoes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem exceções ativas.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {excecoes.map((p) => (
                <li key={p.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium"><PropertyRef propertyId={p.id} label={p.title} /></p>
                    <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold-foreground">
                      {commissionLabel(p.price, p)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.reference} · {formatEuro(p.price)}</p>
                  <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                    “{p.commissionJustification}”
                    {p.commissionApprovedBy && (
                      <span className="mt-1 block text-xs">Autorizado por {p.commissionApprovedBy}</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

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
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.propertyId ? <PropertyRef propertyId={r.propertyId} label={r.propertyRef} /> : "—"}</td>
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
function NavCard({
  href,
  icon: Icon,
  title,
  note,
  alert,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        {alert && <span className="size-2.5 rounded-full bg-destructive" />}
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </Link>
  );
}

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
