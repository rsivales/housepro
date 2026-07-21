"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileDown } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { Button } from "@/components/ui/button";
import { PhoneNote } from "@/components/legal/phone-note";
import { agentById } from "@/lib/data/mock";
import { formatArea, formatCalc, formatEuro } from "@/lib/format";
import {
  DISCLAIMER,
  FIELDS,
  TYPE_LABEL,
  reuniaoById,
  reuniaoDisplayProps,
  reuniaoTotal,
  runCalc,
  type Reuniao,
} from "@/lib/reuniao/model";

export default function Apresentacao() {
  const params = useParams();
  const id = String(params.id);
  const [r, setR] = React.useState<Reuniao | null>(() => reuniaoById(id) ?? null);

  React.useEffect(() => {
    const s = localStorage.getItem(`reuniao:${id}`);
    if (s) {
      try {
        setR(JSON.parse(s));
      } catch {
        /* ignore */
      }
    }
  }, [id]);

  if (!r) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center text-muted-foreground">
        Reunião não encontrada. Volte ao editor e guarde primeiro.
      </div>
    );
  }

  const on = (k: string) => r.sections[k] ?? true;
  const props = reuniaoDisplayProps(r);
  const propsTotal = reuniaoTotal(r);
  const calc = runCalc(r, propsTotal);
  const consultant = agentById(r.consultantId);
  const resumoFields = FIELDS[r.type].filter((f) => f.resumo && r.data[f.key]);
  const date = new Date(r.updatedAt).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-dvh bg-secondary/30 py-8 print:bg-white print:py-0">
      {/* Toolbar (não imprime) */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <p className="text-sm text-muted-foreground">Pré-visualização da apresentação</p>
        <Button onClick={() => window.print()}>
          <FileDown className="size-4" /> Gerar PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl space-y-8 rounded-2xl bg-card p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {/* Capa */}
        <header className="border-b pb-6">
          <Logo />
          <p className="mt-6 text-sm font-medium text-primary">
            Reunião · {TYPE_LABEL[r.type]}
          </p>
          <h1 className="mt-1 font-display text-3xl">{r.clientName || "Cliente"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apresentação preparada por {consultant.name} · {date}
          </p>
        </header>

        {/* Resumo */}
        {on("resumo") && resumoFields.length > 0 && (
          <Block title="Resumo do perfil e objetivos">
            <dl className="grid gap-3 sm:grid-cols-2">
              {resumoFields.map((f) => (
                <div key={f.key}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm">
                    {f.kind === "money"
                      ? formatEuro(Number(r.data[f.key]))
                      : r.data[f.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </Block>
        )}

        {/* Imóveis */}
        {on("imoveis") && props.length > 0 && (
          <Block title="Imóveis selecionados">
            <div className="space-y-3">
              {props.map((p) => (
                <div key={p.key} className="flex items-center gap-4 rounded-xl border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.title}
                      {p.external && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          externo
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {p.location}
                      {p.typology ? ` · ${p.typology}` : ""}
                      {p.area ? ` · ${formatArea(p.area)}` : ""}
                    </p>
                    <p className="text-sm font-semibold">{formatEuro(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Comparação */}
        {on("comparacao") && props.length > 1 && (
          <Block title="Comparação entre imóveis">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Imóvel</th>
                    <th className="py-1 pr-3 font-medium">Tipologia</th>
                    <th className="py-1 pr-3 font-medium">Área</th>
                    <th className="py-1 font-medium">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {props.map((p) => (
                    <tr key={p.key} className="border-t">
                      <td className="py-1.5 pr-3">{p.reference}</td>
                      <td className="py-1.5 pr-3">{p.typology ?? "—"}</td>
                      <td className="py-1.5 pr-3">{p.area ? formatArea(p.area) : "—"}</td>
                      <td className="py-1.5">{formatEuro(p.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        )}

        {/* Simulações */}
        {on("simulacoes") && (
          <Block title="Simulações (estimativas)">
            <dl className="space-y-2 text-sm">
              {calc.lines.map((l) => (
                <div key={l.label} className={`flex justify-between gap-3 ${l.emphasis ? "border-t pt-2 font-semibold" : ""}`}>
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd>{formatCalc(l.value, l.kind)}</dd>
                </div>
              ))}
            </dl>
            {calc.cenarios && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {calc.cenarios.map((c) => (
                  <div key={c.nome} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{c.nome}</p>
                    <p className="mt-1 text-sm font-semibold">{(c.yieldLiquida * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{formatEuro(c.cashFlow)}/ano</p>
                  </div>
                ))}
              </div>
            )}
          </Block>
        )}

        {/* Recomendação */}
        {on("recomendacao") && r.recommendation && (
          <Block title="Recomendação do consultor">
            <p className="text-sm">{r.recommendation}</p>
          </Block>
        )}

        {/* Próximos passos */}
        {on("proximosPassos") && r.nextSteps && (
          <Block title="Próximos passos">
            <p className="text-sm">{r.nextSteps}</p>
          </Block>
        )}

        {/* Contactos */}
        {on("contactos") && (
          <Block title="O seu consultor">
            <div className="flex items-center gap-3">
              <AgentAvatar agent={consultant} className="size-12" />
              <div>
                <p className="font-medium">{consultant.name}</p>
                <p className="text-sm text-muted-foreground">{consultant.agency}</p>
                <p className="text-xs text-muted-foreground">
                  WhatsApp +{consultant.whatsapp} · <PhoneNote />
                </p>
              </div>
            </div>
          </Block>
        )}

        {/* Aviso legal */}
        <footer className="border-t pt-4 text-xs text-muted-foreground">{DISCLAIMER}</footer>
      </article>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-3 font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}
