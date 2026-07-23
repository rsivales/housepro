import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldHalf, Check, Minus, BadgeCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { CAPABILITIES, ROLE_CAPS, ROLE_LABEL, ROLE_ORDER } from "@/lib/data/permissions";
import { agents, agencyById } from "@/lib/data/mock";

export const metadata: Metadata = { title: "Permissões · Back office" };

export default function PermissoesPage() {
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
          Quem vê o quê e quem aprova, por hierarquia. Em produção, estas regras
          são aplicadas pela autenticação e pelas políticas RLS do Supabase.
        </p>

        {/* Matriz papel × capacidade */}
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium">Capacidade</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="p-3 text-center font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr key={cap.key} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{cap.label}</td>
                  {ROLE_ORDER.map((r) => (
                    <td key={r} className="p-3 text-center">
                      {ROLE_CAPS[r][cap.key] ? (
                        <Check className="mx-auto size-4 text-primary" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Equipa e papéis atribuídos */}
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
      </main>
    </div>
  );
}
