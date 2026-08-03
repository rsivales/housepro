"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Check, FileText, ShieldCheck, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { agents } from "@/lib/data/mock";
import {
  VINCULO_LABEL, COMPANY_DOCS, hasCompanyBenefit,
  demoVinculos, type VinculoStatus,
} from "@/lib/data/vinculo";
import { DEFAULT_PLAN } from "@/lib/commission/tiers";

export default function VinculosPage() {
  const [state, setState] = React.useState<Record<string, VinculoStatus>>(
    () => Object.fromEntries(agents.map((a) => [a.id, demoVinculos[a.id] ?? "recibos_verdes"]))
  );
  const [openDocs, setOpenDocs] = React.useState<string | null>(null);

  function set(id: string, status: VinculoStatus) {
    setState((prev) => ({ ...prev, [id]: status }));
  }

  const withCompany = DEFAULT_PLAN.ladder.map((b) => `${b.withCompany}%`).join(" / ");
  const withoutCompany = DEFAULT_PLAN.ladder.map((b) => `${b.withoutCompany}%`).join(" / ");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Administração
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <ShieldCheck className="size-7 text-primary" /> Vínculos & comissionamento
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Define se cada consultor tem <strong>empresa própria</strong> ou trabalha a{" "}
          <strong>recibos verdes</strong>. O escalão «com empresa» (+10 pontos) só
          se ativa depois de os documentos serem validados.
        </p>

        {/* Explicação da escada */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Building2 className="size-4" /> Com empresa validada
            </p>
            <p className="mt-1 font-display text-lg tabular-nums">{withCompany}</p>
            <p className="text-xs text-muted-foreground">por escalão (≤10k / ≤60k / topo)</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> Recibos verdes
            </p>
            <p className="mt-1 font-display text-lg tabular-nums">{withoutCompany}</p>
            <p className="text-xs text-muted-foreground">−10 pontos (custo de entidade contratante)</p>
          </div>
        </div>

        {/* Lista de consultores */}
        <div className="mt-6 space-y-3">
          {agents.map((a) => {
            const status = state[a.id];
            const benefit = hasCompanyBenefit(status);
            return (
              <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <AgentAvatar agent={a} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.agency}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", VINCULO_LABEL[status].badge)}>
                    {VINCULO_LABEL[status].label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => set(a.id, "recibos_verdes")}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      status === "recibos_verdes" ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    Recibos verdes
                  </button>
                  <button
                    type="button"
                    onClick={() => { set(a.id, status === "empresa_validada" ? "empresa_validada" : "empresa_pendente"); setOpenDocs(a.id); }}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      status !== "recibos_verdes" ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    Empresa própria
                  </button>

                  {status === "empresa_pendente" && (
                    <Button size="sm" className="ml-auto" onClick={() => set(a.id, "empresa_validada")}>
                      <Check className="size-4" /> Validar documentos
                    </Button>
                  )}
                  {benefit && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-primary">
                      <BadgeCheck className="size-4" /> +10 pontos ativos
                    </span>
                  )}
                </div>

                {/* Documentos */}
                {openDocs === a.id && status !== "recibos_verdes" && (
                  <div className="mt-3 rounded-xl border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Documentos da empresa</p>
                      <button type="button" onClick={() => setOpenDocs(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {COMPANY_DOCS.map((d) => (
                        <li key={d} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="size-4" /> {d}
                          </span>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary">
                            <Upload className="size-3.5" /> Carregar
                            <input type="file" className="hidden" />
                          </label>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Após rever, carrega em <strong>Validar documentos</strong> para ativar o escalão com empresa.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 rounded-xl border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Enquanto não estiver <strong>validada</strong>, o consultor é calculado como recibos verdes.
          Isto protege a marca de atribuir o benefício sem comprovativo. Persistência no Supabase e
          carregamento real de documentos ligam com a base de dados.
        </p>
      </div>
    </div>
  );
}
