"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldHalf, BadgeCheck, Users, Check, X, Crown, Handshake } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { CAPABILITIES, ROLE_CAPS, ROLE_LABEL, ROLE_ORDER } from "@/lib/data/permissions";
import type { RoleKey } from "@/lib/data/types";
import { agents, agencyById, agentById } from "@/lib/data/mock";
import { teams, partnerships, type TeamStatus } from "@/lib/data/teams";

const PERMS_KEY = "housepro:perms";

export default function PermissoesPage() {
  // Overrides guardados no browser (protótipo). Merge com os defaults.
  const [caps, setCaps] = React.useState<Record<string, Record<string, boolean>>>(() =>
    structuredClone(ROLE_CAPS)
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PERMS_KEY);
      if (raw) {
        const ov = JSON.parse(raw) as Record<string, Record<string, boolean>>;
        setCaps((prev) => {
          const next = structuredClone(prev);
          for (const r of Object.keys(ov))
            for (const c of Object.keys(ov[r])) {
              if (next[r]) next[r][c] = ov[r][c];
            }
          return next;
        });
      }
    } catch {}
  }, []);

  function toggle(role: RoleKey, cap: string) {
    setCaps((prev) => {
      const next = structuredClone(prev);
      next[role][cap] = !next[role][cap];
      try {
        localStorage.setItem(PERMS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>

        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <ShieldHalf className="size-7 text-primary" /> Permissões
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Atribua capacidades a cada papel com os interruptores. A hierarquia separa
          a <strong>administração global (marca)</strong> da{" "}
          <strong>direção de agência (broker)</strong>. Em produção, aplica-se por RLS.
        </p>

        {/* Matriz editável */}
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium">Capacidade</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="p-3 text-center align-bottom font-medium">
                    <span className="block text-xs leading-tight">{ROLE_LABEL[r]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr key={cap.key} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{cap.label}</td>
                  {ROLE_ORDER.map((r) => {
                    const on = caps[r]?.[cap.key];
                    return (
                      <td key={r} className="p-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${ROLE_LABEL[r]} · ${cap.label}`}
                          onClick={() => toggle(r, cap.key)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            on ? "bg-primary" : "bg-secondary"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-4 rounded-full bg-background shadow transition-transform",
                              on ? "translate-x-4" : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Equipa e papéis */}
        <section className="mt-8">
          <h2 className="font-display text-xl">Equipa & papéis</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {agencyById(a.agencyId)?.name} · {a.roleKey ? ROLE_LABEL[a.roleKey] : a.role}
                  </p>
                </div>
                {a.ownAMI && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="size-3.5" /> AMI próprio
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <TeamsSection />
        <PartnershipsSection />
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: TeamStatus }) {
  const map: Record<TeamStatus, string> = {
    aprovada: "bg-primary/15 text-primary",
    pendente: "bg-gold/15 text-gold-foreground",
    rejeitada: "bg-destructive/15 text-destructive",
  };
  const label = { aprovada: "Ativa", pendente: "Pendente", rejeitada: "Rejeitada" }[status];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", map[status])}>{label}</span>;
}

function TeamsSection() {
  const [state, setState] = React.useState<Record<string, TeamStatus>>({});
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Users className="size-5 text-primary" /> Equipas
        </h2>
        <Button size="sm" variant="outline">Propor equipa</Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada equipa tem um <strong>team leader</strong>. A criação é aprovada pela
        administração ou pelo diretor/broker.
      </p>
      <div className="mt-4 space-y-3">
        {teams.map((t) => {
          const st = state[t.id] ?? t.status;
          return (
            <div key={t.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{agencyById(t.agencyId)?.name}</p>
                </div>
                <StatusPill status={st} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold-foreground">
                  <Crown className="size-3.5" /> Leader: {agentById(t.leaderId).name}
                </span>
                <span className="text-muted-foreground">· {t.memberIds.length} membro(s)</span>
              </div>
              {st === "pendente" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setState((s) => ({ ...s, [t.id]: "aprovada" }))}>
                    <Check className="size-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setState((s) => ({ ...s, [t.id]: "rejeitada" }))}>
                    <X className="size-4" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PartnershipsSection() {
  const [state, setState] = React.useState<Record<string, TeamStatus>>({});
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Handshake className="size-5 text-primary" /> Parcerias
        </h2>
        <Button size="sm" variant="outline">Propor parceria</Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Numa parceria, <strong>ambos os agentes têm acesso à informação partilhada</strong>{" "}
        (imóveis co-angariados e respetivas leads).
      </p>
      <div className="mt-4 space-y-3">
        {partnerships.map((p) => {
          const st = state[p.id] ?? p.status;
          return (
            <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {p.agentIds.map((id) => agentById(id).name).join(" + ")}
                </p>
                <StatusPill status={st} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.scope}</p>
              {st === "pendente" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setState((s) => ({ ...s, [p.id]: "aprovada" }))}>
                    <Check className="size-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setState((s) => ({ ...s, [p.id]: "rejeitada" }))}>
                    <X className="size-4" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
