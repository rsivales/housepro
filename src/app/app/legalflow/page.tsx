import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bell, FileText, FolderOpen, PenLine, Scale, TrendingUp, TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSession } from "@/lib/supabase/auth";
import { formatEuro } from "@/lib/format";
import { demoProcesses, STATUS_LABEL } from "@/lib/data/legalflow";

export const metadata: Metadata = { title: "LegalFlow — gestão jurídica" };

export default async function LegalFlowPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const role = session.agent.roleKey ?? "agente";

  const procs = demoProcesses;
  const ativos = procs.filter((p) => p.status !== "concluido").length;
  const pendentes = procs.reduce((s, p) => s + p.checklist.filter((c) => !c.done).length, 0);
  const alertas = procs.reduce((s, p) => s + p.alerts.filter((a) => a.level === "critico").length, 0);
  const pipeline = procs.reduce((s, p) => s + p.financial.pipeline, 0);
  const extras = procs.reduce((s, p) => s + p.financial.extras, 0);
  const pending = procs.reduce((s, p) => s + p.financial.pending, 0);
  const signatures = procs.filter((p) => p.nextSignature);
  const recent = procs.flatMap((p) => p.activity.map((a) => ({ ...a, ref: p.ref }))).slice(0, 5);

  const canCreate = ["superadmin", "admin", "diretor", "coordenador", "agente", "agente_ami"].includes(role);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl">
              <Scale className="size-7 text-primary" /> LegalFlow
            </h1>
            <p className="text-sm text-muted-foreground">Gestão de CPCV e documentos legais — comum a advogado, coordenação, consultor e cliente.</p>
          </div>
          <div className="flex items-center gap-2">
            {(role === "advogado" || role === "admin" || role === "superadmin") && (
              <Link href="/app/legalflow/config" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary">
                <Scale className="size-4 text-primary" /> Configuração
              </Link>
            )}
            {canCreate && (
              <Link href="/app/legalflow/novo" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <PenLine className="size-4" /> Novo processo
              </Link>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={FolderOpen} value={String(ativos)} label="Processos ativos" />
          <Kpi icon={FileText} value={String(pendentes)} label="Documentos pendentes" />
          <Kpi icon={TriangleAlert} value={String(alertas)} label="Alertas ativos" tone={alertas > 0 ? "alert" : undefined} />
          <Kpi icon={TrendingUp} value={formatEuro(pipeline)} label="Pipeline estimado" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Processos em destaque */}
          <div>
            <h2 className="font-display text-xl">Processos em destaque</h2>
            <div className="mt-3 space-y-3">
              {procs.map((p) => {
                const st = STATUS_LABEL[p.status];
                return (
                  <Link key={p.id} href={`/app/legalflow/${p.id}`} className="block rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        {p.ref}
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", st.badge)}>
                          <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{p.progress}%</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <p className="font-medium">{p.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.typeNote}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={cn("h-full rounded-full", p.status === "bloqueado" ? "bg-destructive" : p.status === "pendencias" ? "bg-amber-500" : "bg-primary")} style={{ width: `${p.progress}%` }} />
                    </div>
                    {p.alerts.map((a, i) => (
                      <p key={i} className={cn("mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs", a.level === "critico" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {a.text}
                      </p>
                    ))}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Coluna direita */}
          <div className="space-y-6">
            {signatures.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-sm font-medium"><PenLine className="size-4 text-primary" /> Próximas assinaturas</p>
                <ul className="mt-3 space-y-3">
                  {signatures.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.ref}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.nextSignature!.entity}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-primary">{new Date(p.nextSignature!.date).toLocaleDateString("pt-PT")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-medium"><Bell className="size-4 text-primary" /> Atividade recente</p>
              <ul className="mt-3 space-y-2.5">
                {recent.map((a) => (
                  <li key={`${a.ref}-${a.id}`} className="text-sm">
                    <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{a.action}</span>
                    <span className="block text-xs text-muted-foreground">{a.ref} · {a.when}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-medium"><TrendingUp className="size-4 text-primary" /> Resumo financeiro</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row label="Pipeline total" value={formatEuro(pipeline)} />
                <Row label="Extras aprovados" value={formatEuro(extras)} />
                <Row label="Pendente aprovação" value={formatEuro(pending)} />
              </dl>
            </div>
          </div>
        </div>

        <p className="mt-8 flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <ArrowRight className="size-3.5" /> Abre um processo para ver o documento que o advogado está a construir e acompanhar em tempo real.
        </p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, value, label, tone }: { icon: React.ElementType; value: string; label: string; tone?: "alert" }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", tone === "alert" && "border-destructive/40")}>
      <Icon className={cn("size-5", tone === "alert" ? "text-destructive" : "text-primary")} />
      <p className="mt-2 font-display text-2xl tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
