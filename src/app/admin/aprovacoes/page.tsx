import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle, BadgeCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { ApprovalQueue, type PendingItem } from "@/components/admin/approval-queue";
import { NotifyMissingButton } from "@/components/admin/notify-missing-button";
import { properties, pendingApprovals, agentById, agencyById } from "@/lib/data/mock";
import { docStatus, docLabel } from "@/lib/imovel/model";

export const metadata: Metadata = { title: "Aprovações · Back office" };

export default function AprovacoesPage() {
  const pend = pendingApprovals();
  const items: PendingItem[] = pend.map((p) => {
    const agent = agentById(p.agentId);
    const st = docStatus(p.documents ?? [], p.sellerType === "empresa");
    return {
      id: p.id,
      reference: p.reference,
      title: p.title,
      location: `${p.parish}, ${p.municipality}`,
      agentName: agent.name,
      agencyName: agencyById(agent.agencyId)?.name ?? agent.agency,
      submittedAt: p.submittedAt,
      missingCount: st.missingCount,
      missingLabels: st.missing.map(docLabel),
    };
  });

  // Notificação vermelha: imóveis (não vendidos) com documentos obrigatórios em falta.
  const docMissing = properties
    .filter((p) => p.status !== "vendido")
    .map((p) => ({ p, st: docStatus(p.documents ?? [], p.sellerType === "empresa") }))
    .filter((x) => !x.st.complete);

  // Imóveis publicados sem aprovação necessária (AMI próprio) — informativo.
  const amiAuto = properties.filter((p) => agentById(p.agentId).ownAMI && p.status !== "vendido");

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel de gestão
        </Link>

        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <ShieldCheck className="size-7 text-primary" /> Aprovações
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Os imóveis ficam <strong>ocultos ao público até aprovação</strong>. A
          administração/coordenação tem <strong>24–48h</strong> para se pronunciar.
          Agentes com <strong>AMI próprio</strong> publicam sob a sua responsabilidade,
          sem aprovação.
        </p>

        {/* Alerta vermelho de documentos obrigatórios em falta */}
        {docMissing.length > 0 && (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="size-5" />
              {docMissing.length} imóvel(is) com documentos obrigatórios em falta
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {docMissing.map(({ p, st }) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/imovel/${p.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="font-medium text-foreground">{p.reference}</span> · {p.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                      {st.missingCount} em falta
                    </span>
                    <NotifyMissingButton propertyId={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fila de aprovação */}
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl">A aguardar aprovação ({items.length})</h2>
          <ApprovalQueue items={items} />
        </section>

        {/* AMI próprio (auto-publicado) */}
        {amiAuto.length > 0 && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <BadgeCheck className="size-5 text-primary" /> Publicados por AMI próprio
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Isentos de aprovação — responsabilidade e documentação do próprio agente.
            </p>
            <ul className="mt-3 space-y-2">
              {amiAuto.map((p) => {
                const agent = agentById(p.agentId);
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                    <span>
                      <span className="font-medium">{p.reference}</span> · {p.title}
                    </span>
                    <span className="text-muted-foreground">{agent.name} · AMI próprio</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
