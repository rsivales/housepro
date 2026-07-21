"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Presentation } from "lucide-react";

import { TYPE_LABEL, demoReunioes, type Reuniao, type ReuniaoType } from "@/lib/reuniao/model";
import { Button } from "@/components/ui/button";

export default function ReuniaoList() {
  const [drafts, setDrafts] = React.useState<Reuniao[]>([]);

  React.useEffect(() => {
    const items: Reuniao[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("reuniao:")) {
        try {
          items.push(JSON.parse(localStorage.getItem(key)!));
        } catch {
          /* ignore */
        }
      }
    }
    setDrafts(items);
  }, []);

  const seen = new Set(drafts.map((d) => d.id));
  const all = [...drafts, ...demoReunioes.filter((d) => !seen.has(d.id))];

  const types: ReuniaoType[] = ["comprador", "vendedor", "investidor"];

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Área profissional
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 text-primary">
          <Presentation className="size-5" />
          <p className="text-sm font-medium">Reunião Uau</p>
        </div>
        <h1 className="mt-1 font-display text-3xl">Apresentações personalizadas</h1>
        <p className="mt-2 text-muted-foreground">
          Crie uma apresentação para comprador, vendedor ou investidor — com
          simulações, PDF e registo do resultado.
        </p>

        {/* Nova */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {types.map((t) => (
            <Button key={t} asChild variant="outline" className="h-auto justify-start py-4">
              <Link href={`/app/reuniao/novo-${t}`}>
                <Plus className="size-4" /> Nova · {TYPE_LABEL[t]}
              </Link>
            </Button>
          ))}
        </div>

        {/* Lista */}
        <div className="mt-10 space-y-3">
          {all.map((r) => (
            <Link
              key={r.id}
              href={`/app/reuniao/${r.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.clientName || "Sem nome"}{" "}
                  <span className="text-muted-foreground">· {TYPE_LABEL[r.type]}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.status} · atualizado {r.updatedAt}
                </p>
              </div>
              <span className="text-sm text-primary">Abrir →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
