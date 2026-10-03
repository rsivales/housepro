import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Home } from "lucide-react";

import { getBuyerPortalData } from "@/lib/db/buyer-portal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Portal do comprador", robots: { index: false, follow: false } };

export default async function CompradorTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getBuyerPortalData(token);
  if (!data) notFound();

  return (
    <div className="hp min-h-dvh bg-[var(--card)] text-[var(--hp-navy)]">
      <header className="border-b bg-[var(--hp-navy)] text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Portal do comprador · HousePro</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">Olá, {data.name.split(" ")[0] || "bem-vindo(a)"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {data.propertyRef ? (
          <>
            <section className="overflow-hidden rounded-2xl border bg-white">
              <div className="flex items-center gap-4 p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {data.propertyImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.propertyImage} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground"><Home className="size-5" /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{data.propertyTitle || "O seu imóvel"}</p>
                  <p className="text-sm text-[var(--hp-text-2)]">Ref. {data.propertyRef}{data.amount ? ` · ${formatEuro(data.amount)}` : ""}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl text-[var(--hp-navy)]">Estado do processo</h2>
              <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />
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
            </section>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed bg-white px-4 py-6 text-center text-sm text-[var(--hp-text-2)]">
            Ainda não há nenhum processo de compra associado. Assim que o seu consultor iniciar um negócio, verá aqui a evolução.
          </p>
        )}

        <p className="text-xs text-[var(--hp-text-2)]">
          Acompanhamento fornecido pelo seu consultor HousePro. Esta página é privada e só de leitura — não partilhe o link.
        </p>
      </main>
    </div>
  );
}
