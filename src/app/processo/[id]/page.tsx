import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bell, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DealStepper } from "@/components/process/deal-stepper";
import { DealCloseTrigger } from "@/components/process/deal-close-trigger";
import { EscrituraChecklist } from "@/components/process/escritura-checklist";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { agentById } from "@/lib/data/mock";
import { dealById } from "@/lib/data/deal";

const eur0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const d = dealById(id);
  return { title: d ? `Processo ${d.reference}` : "Processo" };
}

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = dealById(id);
  if (!deal) notFound();

  const angariador = agentById(deal.angariadorId);
  const consultor = agentById(deal.consultorCompradorId);
  const coordenador = agentById(deal.coordenadorId);

  const people = [
    { label: "Comprador", name: deal.buyerName, agent: null },
    { label: "Vendedor", name: deal.sellerName, agent: null },
    { label: "Consultor do comprador", name: consultor.name, agent: consultor },
    { label: "Angariador", name: angariador.name, agent: angariador },
    { label: "Coordenação", name: coordenador.name, agent: coordenador },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-primary">
          Processo de compra · {deal.reference}
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          {deal.propertyTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {deal.location} · {eur0.format(deal.amount)}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Stepper */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <DealStepper stage={deal.stage} creditStage={deal.creditStage} />
            </div>
            {/* Fecho → faturação + override + notificações (coordenação/admin) */}
            <DealCloseTrigger
              dealRef={deal.reference}
              producerId={deal.angariadorId}
              producerName={angariador.name}
              amount={deal.amount}
              alreadyClosed={deal.stage === "concluido"}
            />
            {/* Rede de segurança da escritura/mudança */}
            {["cpcv", "escritura", "concluido"].includes(deal.stage) && (
              <EscrituraChecklist
                dealRef={deal.reference}
                responsavelId={deal.consultorCompradorId}
                responsavelName={consultor.name}
              />
            )}
          </div>

          {/* Aside: pessoas + notas */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="font-medium">Envolvidos</h2>
              <ul className="mt-4 space-y-3">
                {people.map((p) => (
                  <li key={p.label} className="flex items-center gap-3">
                    {p.agent ? (
                      <AgentAvatar agent={p.agent} className="size-9" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                        {p.name.slice(0, 2)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-secondary/40 p-5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" /> Quem faz o quê
              </p>
              <p className="mt-2">
                A <strong>coordenação</strong> (ou um admin) faz avançar as etapas
                — proposta aceite, reserva, CPCV e escritura. O consultor recolhe
                informação e documentos; comprador e vendedor acompanham em tempo
                real.
              </p>
              <p className="mt-3 flex items-center gap-2 font-medium text-foreground">
                <Bell className="size-4 text-primary" /> Notificações
              </p>
              <p className="mt-2">
                Cada mudança de etapa notifica todos os envolvidos (comprador,
                vendedor, consultor e coordenação).
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
