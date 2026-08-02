import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { agencies, agentsByAgency, propertiesByAgency } from "@/lib/data/mock";

export const metadata: Metadata = { title: "Consultores · Back office" };

export default function AdminConsultoresPage() {
  const total = agencies.reduce((s, a) => s + agentsByAgency(a.id).length, 0);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Users className="size-7 text-primary" /> Consultores ({total})
        </h1>

        <div className="mt-6 space-y-8">
          {agencies.map((a) => {
            const team = agentsByAgency(a.id);
            const imoveis = propertiesByAgency(a.id).length;
            return (
              <section key={a.id}>
                <h2 className="flex items-center justify-between font-display text-xl">
                  <span>{a.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {team.length} consultor(es) · {imoveis} imóvel(is)
                  </span>
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {team.map((agent) => (
                    <li key={agent.id}>
                      <Link
                        href={`/consultor/${agent.id}`}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <AgentAvatar agent={agent} className="size-10" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{agent.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{agent.role}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
