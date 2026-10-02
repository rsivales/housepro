import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, CalendarClock, Check, Eye, Users } from "lucide-react";

import { getOwnerPortalData } from "@/lib/db/owner-portal";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/data/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Portal do proprietário", robots: { index: false, follow: false } };

export default async function ProprietarioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getOwnerPortalData(token);
  if (!data) notFound();

  const kpis = [
    { icon: CalendarCheck, label: "Visitas realizadas", value: data.visitsDone },
    { icon: CalendarClock, label: "Visitas agendadas", value: data.visitsScheduled },
    { icon: Users, label: "Interessados", value: data.leadsCount },
    { icon: Eye, label: "Interesse online", value: `${Math.round(data.interest)}%` },
  ];

  return (
    <div className="hp min-h-dvh bg-[var(--card)] text-[var(--hp-navy)]">
      <header className="border-b bg-[var(--hp-navy)] text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Portal do proprietário · HousePro</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">{data.title || "O seu imóvel"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/85">
            <span>Ref. {data.ref}</span>
            {data.municipality && <span>· {data.municipality}</span>}
            {data.status && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[data.status])}>
                {STATUS_LABEL[data.status]}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {data.offMarket && (
          <p className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
            Este imóvel está <strong>fora de mercado</strong> — visível internamente à agência, não ao público.
          </p>
        )}

        {/* KPIs */}
        <section>
          <h2 className="font-display text-xl text-[var(--hp-navy)]">Atividade</h2>
          <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border bg-white p-4">
                <k.icon className="size-5 text-[var(--hp-red)]" />
                <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
                <p className="text-xs text-[var(--hp-text-2)]">{k.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Processo / marcos */}
        <section>
          <h2 className="font-display text-xl text-[var(--hp-navy)]">Estado do processo</h2>
          <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />
          {data.dealStage ? (
            <ol className="mt-4 space-y-2">
              {data.milestones.map((m) => (
                <li key={m.stage} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      m.reached ? "bg-[var(--hp-red)] text-white" : "border text-[var(--hp-text-2)]"
                    )}
                  >
                    {m.reached ? <Check className="size-4" /> : ""}
                  </span>
                  <span className={cn("text-sm", m.reached ? "font-medium text-[var(--hp-navy)]" : "text-[var(--hp-text-2)]")}>
                    {m.label}
                  </span>
                  {m.at && (
                    <span className="ml-auto text-xs text-[var(--hp-text-2)]">
                      {new Date(m.at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed bg-white px-4 py-6 text-center text-sm text-[var(--hp-text-2)]">
              Ainda não há um processo de venda em curso. Assim que houver uma proposta, reserva ou CPCV, verá aqui a evolução.
            </p>
          )}
        </section>

        <p className="text-xs text-[var(--hp-text-2)]">
          Acompanhamento fornecido pelo seu consultor HousePro. Esta página é privada e só de leitura — não partilhe o link.
        </p>
      </main>
    </div>
  );
}
